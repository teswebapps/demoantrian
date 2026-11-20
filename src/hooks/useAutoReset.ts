'use client'

import { useEffect } from 'react'
import { ref, get, update, push, set } from 'firebase/database'
import { db } from '@/lib/firebase'

const pad = (n: number) => String(n).padStart(2, '0')
const getTanggalIndo = (d: Date) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
const getTanggalKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const cleanNama = (nama: string) => nama.trim().toLowerCase().replace(/\s+/g, '_')

// Reset antrian manual (tidak menghapus statistikAktivitas / Total Bulanan)
export async function jalankanResetAntrianManual(tokoId: string) {
  const now = new Date()
  const tKey = getTanggalKey(now)
  await set(ref(db, `toko/${tokoId}/antrian`), null)
  await set(ref(db, `toko/${tokoId}/lastResetTimestamp`), now.getTime())
  await set(ref(db, `toko/${tokoId}/resetAntrianHarian/${tKey}`), now.getTime())
}

// Reset istirahat langsung berdasarkan jam check-in:
// - '13': hanya yang check-in < 12.00
// - '16': hanya yang check-in >= 12.00
export async function jalankanResetIstirahatLangsung(tokoId: string, gelombangTarget?: '13' | '16') {
  const now = new Date()
  const nowTs = now.getTime()
  const jamSekarang = now.getHours()
  const tKey = getTanggalKey(now)
  const tglIndo = getTanggalIndo(now)

  const gelombang: '13' | '16' | null =
    gelombangTarget || (jamSekarang >= 16 ? '16' : jamSekarang >= 13 ? '13' : null)

  if (!gelombang) return 0

  const [antrianSnap, checkinSnap] = await Promise.all([
    get(ref(db, `toko/${tokoId}/antrian`)),
    get(ref(db, `toko/${tokoId}/checkinHarian`)),
  ])

  const antrianData = antrianSnap.val() || {}
  const checkinAll = checkinSnap.val() || {}
  const updates: Record<string, any> = {
    [`toko/${tokoId}/resetIstirahatLog/${tKey}/gelombang_${gelombang}`]: nowTs,
  }
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
      (gelombang === '13' && isCheckinPagi) ||
      (gelombang === '16' && isCheckinSiang)

    if (!cocokGelombang) continue

    updates[`toko/${tokoId}/antrian/${key}`] = null
    jumlahKeluar += 1

    logAktivitas.push({
      nama: item.nama,
      aksi: 'KeluarAntrian',
      waktu: nowTs,
      tanggal: tglIndo,
      tanggalKey: tKey,
      hasil: `Reset Istirahat ${gelombang}.00`,
    })
  }

  await update(ref(db), updates)

  for (const log of logAktivitas) {
    await push(ref(db, `toko/${tokoId}/statistikAktivitas`), log)
  }

  return jumlahKeluar
}

export function useAutoReset(tokoId?: string) {
  useEffect(() => {
    if (!tokoId) return

    const cekJadwalTepatWaktu = async () => {
      try {
        const now = new Date()
        const jam = now.getHours()
        const menit = now.getMinutes()
        const tKey = getTanggalKey(now)

        // 1. Reset Antrian otomatis tepat jam 00.00 (tidak menghapus rekap/total bulanan)
        if (jam === 0 && menit === 0) {
          const resetHariRef = ref(db, `toko/${tokoId}/resetAntrianHarian/${tKey}`)
          const resetHariSnap = await get(resetHariRef)
          if (!resetHariSnap.exists()) {
            const awalHariTs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime()
            await update(ref(db), {
              [`toko/${tokoId}/antrian`]: null,
              [`toko/${tokoId}/lastResetTimestamp`]: awalHariTs,
              [`toko/${tokoId}/resetAntrianHarian/${tKey}`]: Date.now(),
            })
          }
        }

        // 2. Reset Istirahat gelombang 13.00 (check-in < 12.00) tepat jam 13.00
        if (jam === 13 && menit === 0) {
          const flag13Snap = await get(ref(db, `toko/${tokoId}/resetIstirahatLog/${tKey}/gelombang_13`))
          if (!flag13Snap.exists()) {
            await jalankanResetIstirahatLangsung(tokoId, '13')
          }
        }

        // 3. Reset Istirahat gelombang 16.00 (check-in >= 12.00) tepat jam 16.00
        if (jam === 16 && menit === 0) {
          const flag16Snap = await get(ref(db, `toko/${tokoId}/resetIstirahatLog/${tKey}/gelombang_16`))
          if (!flag16Snap.exists()) {
            await jalankanResetIstirahatLangsung(tokoId, '16')
          }
        }
      } catch (err) {
        console.error('Gagal mengecek jadwal reset:', err)
      }
    }

    const interval = setInterval(cekJadwalTepatWaktu, 20_000)
    return () => clearInterval(interval)
  }, [tokoId])
}