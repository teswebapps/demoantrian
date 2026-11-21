'use client'

import { ref, get, update, push, set } from 'firebase/database'
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

// Reset antrian manual (tidak menghapus statistikAktivitas / Total Bulanan)
export async function jalankanResetAntrianManual(tokoId: string) {
  const now = new Date()
  const tKey = getTanggalKey(now)
  await set(ref(db, `toko/${tokoId}/antrian`), null)
  await set(ref(db, `toko/${tokoId}/lastResetTimestamp`), now.getTime())
  await set(ref(db, `toko/${tokoId}/resetAntrianHarian/${tKey}`), now.getTime())
}

// Reset istirahat langsung berdasarkan jam check-in:
// - '1' (sesi istirahat 1): yang check-in < 12.00
// - '2' (sesi istirahat 2): yang check-in >= 12.00
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

  const mappedTarget: GelombangReset | null =
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

  const [antrianSnap, checkinSnap] = await Promise.all([
    get(ref(db, `toko/${tokoId}/antrian`)),
    get(ref(db, `toko/${tokoId}/checkinHarian`)),
  ])

  const antrianData = antrianSnap.val() || {}
  const checkinAll = checkinSnap.val() || {}
  const updates: Record<string, any> = {}
  const logAktivitas: any[] = []
  let jumlahKeluar = 0

  for (const key of Object.keys(antrianData)) {
    const item = antrianData[key]
    if (!item || !item.nama) continue

    const clean = cleanNama(item.nama)
    const checkinHariIni = checkinAll?.[clean]?.[tKey]
    const waktuCheckin = Number(checkinHariIni?.waktu || 0)
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

  return jumlahKeluar
}

// Mode manual: tidak ada timer interval maupun reset otomatis
export function useAutoReset(_tokoId?: string) {
  // Sengaja dikosongkan agar reset hanya berjalan manual dari menu Admin
}