'use client'

import { useEffect } from 'react'
import { ref, get, update, push, set } from 'firebase/database'
import { db } from '@/lib/firebase'

const pad = (n: number) => String(n).padStart(2, '0')
const getTanggalIndo = (d: Date) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
const getTanggalKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const cleanNama = (nama: string) => nama.trim().toLowerCase().replace(/\s+/g, '_')

export async function jalankanResetAntrianManual(tokoId: string) {
  const now = new Date()
  const tKey = getTanggalKey(now)
  await set(ref(db, `toko/${tokoId}/antrian`), null)
  await set(ref(db, `toko/${tokoId}/lastResetTimestamp`), now.getTime())
  await set(ref(db, `toko/${tokoId}/resetAntrianHarian/${tKey}`), now.getTime())
}

// Reset Istirahat langsung berbasis jam check-in:
// - Gelombang '13' (jam 13.00 - 15.59): hanya check-in pagi (< 12.00)
// - Gelombang '16' (jam >= 16.00): hanya check-in siang (>= 12.00)
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
    updates[`toko/${tokoId}/checkinHarian/${clean}/${tKey}/terlewatReset_${gelombang}`] = null
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

    const cekOtomatis = async () => {
      try {
        const now = new Date()
        const tKey = getTanggalKey(now)
        const jamSekarang = now.getHours()

        // 1. Reset Antrian otomatis saat pergantian hari 00.00 (tidak menghapus rekap/total bulanan)
        const resetHariSnap = await get(ref(db, `toko/${tokoId}/resetAntrianHarian/${tKey}`))
        if (!resetHariSnap.exists()) {
          const awalHariTs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime()
          await update(ref(db), {
            [`toko/${tokoId}/antrian`]: null,
            [`toko/${tokoId}/lastResetTimestamp`]: awalHariTs,
            [`toko/${tokoId}/resetAntrianHarian/${tKey}`]: Date.now(),
          })
        }

        // 2. Reset Istirahat langsung per gelombang saat masuk jam 13.00 atau 16.00
        if (jamSekarang >= 13) {
          const gelombang: '13' | '16' = jamSekarang >= 16 ? '16' : '13'
          const flagSnap = await get(ref(db, `toko/${tokoId}/resetIstirahatLog/${tKey}/gelombang_${gelombang}`))
          if (!flagSnap.exists()) {
            await jalankanResetIstirahatLangsung(tokoId, gelombang)
          }
        }
      } catch (err) {
        console.error('Gagal menjalankan auto reset:', err)
      }
    }

    cekOtomatis()
    const interval = setInterval(cekOtomatis, 15_000)
    return () => clearInterval(interval)
  }, [tokoId])
}