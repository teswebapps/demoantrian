'use client'

import { useEffect } from 'react'
import { ref, get, update, push, set, runTransaction } from 'firebase/database'
import { db } from '@/lib/firebase'

const pad = (n: number) => String(n).padStart(2, '0')
const getTanggalIndo = (d: Date) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
const getTanggalKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const cleanNama = (nama: string) => nama.trim().toLowerCase().replace(/\s+/g, '_')

export type GelombangReset = '1' | '2'

export interface JamMenitConfig {
  jam: number
  menit: number
  label: string
}

export function parseJamMenit(raw: any, fallbackJam: number, fallbackMenit: number): JamMenitConfig {
  if (typeof raw === 'string' && raw.trim()) {
    const normalized = raw.trim().replace('.', ':')
    const parts = normalized.split(':')
    const j = Number(parts[0])
    const m = Number(parts[1] ?? 0)
    if (!Number.isNaN(j) && !Number.isNaN(m) && j >= 0 && j <= 23 && m >= 0 && m <= 59) {
      return {
        jam: j,
        menit: m,
        label: `${pad(j)}.${pad(m)}`,
      }
    }
  }
  return {
    jam: fallbackJam,
    menit: fallbackMenit,
    label: `${pad(fallbackJam)}.${pad(fallbackMenit)}`,
  }
}

export async function ambilKonfigurasiJamReset(tokoId: string): Promise<{
  gelombang1: JamMenitConfig
  gelombang2: JamMenitConfig
}> {
  const snap = await get(ref(db, `toko/${tokoId}/setting`))
  const setting = snap.exists() ? snap.val() : {}

  const gelombang1 = parseJamMenit(
    setting?.jamResetIstirahat1 ?? setting?.resetIstirahat1 ?? setting?.jamReset1,
    13,
    0
  )
  const gelombang2 = parseJamMenit(
    setting?.jamResetIstirahat2 ?? setting?.resetIstirahat2 ?? setting?.jamReset2,
    16,
    0
  )

  return { gelombang1, gelombang2 }
}

// 1. Reset Antrian: hanya membersihkan antrian harian (tidak menghapus checkinHarian maupun statistikAktivitas Deal/Lihat)
export async function jalankanResetAntrianManual(tokoId: string) {
  const now = new Date()
  const tKey = getTanggalKey(now)
  await set(ref(db, `toko/${tokoId}/antrian`), null)
  await set(ref(db, `toko/${tokoId}/resetAntrianHarian/${tKey}`), now.getTime())
  await update(ref(db, `toko/${tokoId}/autoResetLog/${tKey}`), {
    antrianDone: true,
    antrianAt: now.getTime(),
  })
}

// 2. Reset Istirahat: mengeluarkan promotor Standby sesuai gelombang check-in
// - Gelombang '1' (13.00): check-in < 12.00
// - Gelombang '2' (16.00): check-in >= 12.00
export async function jalankanResetIstirahatLangsung(
  tokoId: string,
  gelombangTarget?: GelombangReset | '13' | '16',
  labelOverride?: string
) {
  const now = new Date()
  const nowTs = now.getTime()
  const jamSekarang = now.getHours()
  const tKey = getTanggalKey(now)
  const tglIndo = getTanggalIndo(now)

  const mappedTarget: GelombangReset =
    gelombangTarget === '13' || gelombangTarget === '1'
      ? '1'
      : gelombangTarget === '16' || gelombangTarget === '2'
        ? '2'
        : jamSekarang >= 15
          ? '2'
          : '1'

  const cfg = await ambilKonfigurasiJamReset(tokoId)
  const aktifCfg = mappedTarget === '1' ? cfg.gelombang1 : cfg.gelombang2
  const labelJam = labelOverride || aktifCfg.label

  const waktuResetHariIni = new Date(now)
  waktuResetHariIni.setHours(aktifCfg.jam, aktifCfg.menit, 0, 0)
  const tsResetHariIni = waktuResetHariIni.getTime()

  const [antrianSnap, checkinSnap, statSnap] = await Promise.all([
    get(ref(db, `toko/${tokoId}/antrian`)),
    get(ref(db, `toko/${tokoId}/checkinHarian`)),
    get(ref(db, `toko/${tokoId}/statistikAktivitas`)),
  ])

  const antrianData = antrianSnap.val() || {}
  const checkinAll = checkinSnap.val() || {}
  const statAll = statSnap.val() || {}

  const jedaPerPromotor = new Map<string, { mulaiSebelumReset: number; kembaliSetelahReset: number }>()
  for (const sKey of Object.keys(statAll)) {
    const s = statAll[sKey]
    if (!s || !s.nama) continue
    const samaTanggal = (s.tanggalKey && s.tanggalKey === tKey) || (s.tanggal && s.tanggal === tglIndo)
    if (!samaTanggal) continue

    const isJeda =
      s.aksi === 'MulaiIbadah' ||
      s.aksi === 'Ibadah' ||
      s.aksi === 'PanggilCS' ||
      s.aksi === 'KembaliCS' ||
      s.aksi === 'KembaliAntriDariCS'
    if (!isJeda) continue

    const nKey = cleanNama(s.nama)
    const mulaiTs = Number(s.waktuMulai || s.waktu || 0)
    const selesaiTs = Number(
      s.waktuSelesai ||
        (s.aksi === 'KembaliCS' || s.aksi === 'KembaliAntriDariCS' ? s.waktu : 0) ||
        0
    )
    const curr = jedaPerPromotor.get(nKey) || { mulaiSebelumReset: 0, kembaliSetelahReset: 0 }

    if (mulaiTs > 0 && mulaiTs < tsResetHariIni) {
      curr.mulaiSebelumReset = Math.max(curr.mulaiSebelumReset, mulaiTs)
    }
    if (selesaiTs >= tsResetHariIni) {
      curr.kembaliSetelahReset = Math.max(curr.kembaliSetelahReset, selesaiTs)
    }
    jedaPerPromotor.set(nKey, curr)
  }

  const updates: Record<string, any> = {}
  const logAktivitas: any[] = []
  let jumlahKeluar = 0

  for (const key of Object.keys(antrianData)) {
    const item = antrianData[key]
    if (!item || !item.nama) continue

    const clean = cleanNama(item.nama)
    const jedaInfo = jedaPerPromotor.get(clean)
    const akaliResetLewatJeda = Boolean(
      jedaInfo &&
      jedaInfo.mulaiSebelumReset > 0 &&
      jedaInfo.kembaliSetelahReset >= tsResetHariIni
    )

    if (item.status !== 'Standby' && !akaliResetLewatJeda) continue

    const checkinHariIni = checkinAll?.[clean]?.[tKey]
    const waktuCheckin = Number(checkinHariIni?.waktu || item.waktuStandby || 0)
    if (!waktuCheckin) continue

    const jamCheckin = new Date(waktuCheckin).getHours()
    const isCheckinPagi = jamCheckin < 12
    const isCheckinSiang = jamCheckin >= 12

    const cocokGelombang =
      (mappedTarget === '1' && isCheckinPagi) ||
      (mappedTarget === '2' && isCheckinSiang)

    if (!cocokGelombang) continue

    updates[`toko/${tokoId}/antrian/${key}`] = null
    jumlahKeluar += 1

    logAktivitas.push({
      nama: item.nama,
      aksi: 'KeluarAntrian',
      waktu: nowTs,
      tanggal: tglIndo,
      tanggalKey: tKey,
      hasil: `Reset Istirahat ${labelJam}`,
    })
  }

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates)
  }

  for (const log of logAktivitas) {
    await push(ref(db, `toko/${tokoId}/statistikAktivitas`), log)
  }

  const fieldDone = mappedTarget === '1' ? 'istirahat1Done' : 'istirahat2Done'
  const fieldAt = mappedTarget === '1' ? 'istirahat1At' : 'istirahat2At'
  await update(ref(db, `toko/${tokoId}/autoResetLog/${tKey}`), {
    [fieldDone]: true,
    [fieldAt]: nowTs,
  })

  return jumlahKeluar
}

const sudahLewatJam = (now: Date, target: JamMenitConfig) =>
  now.getHours() > target.jam ||
  (now.getHours() === target.jam && now.getMinutes() >= target.menit)

const dalamJendelaEksekusi = (now: Date, target: JamMenitConfig, toleransiMenit = 5) => {
  const menitSekarang = now.getHours() * 60 + now.getMinutes()
  const menitTarget = target.jam * 60 + target.menit
  return menitSekarang >= menitTarget && menitSekarang <= menitTarget + toleransiMenit
}

async function klaimJadwalHariIni(tokoId: string, tKey: string, fieldDone: string): Promise<boolean> {
  const tx = await runTransaction(
    ref(db, `toko/${tokoId}/autoResetLog/${tKey}/${fieldDone}`),
    (curr) => (curr === true ? undefined : true)
  )
  return Boolean(tx.committed)
}

export async function jalankanAutoResetTerjadwal(tokoId: string) {
  if (!tokoId) return

  const settingSnap = await get(ref(db, `toko/${tokoId}/setting`))
  if (!settingSnap.exists()) return

  const setting = settingSnap.val() || {}
  const autoAntrianOn = Boolean(setting?.autoResetAntrian)
  const autoIstirahatOn = Boolean(setting?.autoResetIstirahat)

  if (!autoAntrianOn && !autoIstirahatOn) return

  const now = new Date()
  const tKey = getTanggalKey(now)
  const logRef = ref(db, `toko/${tokoId}/autoResetLog/${tKey}`)
  const logSnap = await get(logRef)
  const logHariIni = logSnap.exists() ? logSnap.val() : {}

  // 1. Auto Reset Antrian (default 00.01)
  if (autoAntrianOn && !logHariIni?.antrianDone) {
    const jamAntrian = parseJamMenit(setting?.jamAutoResetAntrian, 0, 1)
    if (sudahLewatJam(now, jamAntrian)) {
      const berhakJalan = await klaimJadwalHariIni(tokoId, tKey, 'antrianDone')
      if (berhakJalan) {
        await jalankanResetAntrianManual(tokoId)
      }
    }
  }

  // 2. Auto Reset Istirahat Gelombang 1 & 2
  if (autoIstirahatOn) {
    const cfg = await ambilKonfigurasiJamReset(tokoId)

    if (!logHariIni?.istirahat1Done && sudahLewatJam(now, cfg.gelombang1)) {
      if (dalamJendelaEksekusi(now, cfg.gelombang1, 5)) {
        const berhakJalan1 = await klaimJadwalHariIni(tokoId, tKey, 'istirahat1Done')
        if (berhakJalan1) {
          await jalankanResetIstirahatLangsung(tokoId, '1', cfg.gelombang1.label)
        }
      } else {
        await update(logRef, { istirahat1Done: true, istirahat1At: now.getTime() })
      }
    }

    if (!logHariIni?.istirahat2Done && sudahLewatJam(now, cfg.gelombang2)) {
      if (dalamJendelaEksekusi(now, cfg.gelombang2, 5)) {
        const berhakJalan2 = await klaimJadwalHariIni(tokoId, tKey, 'istirahat2Done')
        if (berhakJalan2) {
          await jalankanResetIstirahatLangsung(tokoId, '2', cfg.gelombang2.label)
        }
      } else {
        await update(logRef, { istirahat2Done: true, istirahat2At: now.getTime() })
      }
    }
  }
}

export function useAutoReset(tokoId?: string) {
  useEffect(() => {
    if (!tokoId) return

    let aktif = true
    let sedangProses = false

    const cek = async () => {
      if (!aktif || sedangProses) return
      sedangProses = true
      try {
        await jalankanAutoResetTerjadwal(tokoId)
      } catch (err) {
        console.error('Auto reset error:', err)
      } finally {
        sedangProses = false
      }
    }

    cek()
    const interval = setInterval(cek, 20_000)

    return () => {
      aktif = false
      clearInterval(interval)
    }
  }, [tokoId])
}