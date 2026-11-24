import { get, push, ref, runTransaction, update } from 'firebase/database'

const pad = (n: number) => String(n).padStart(2, '0')
export const getTodayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const getTanggalIndo = (d = new Date()) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`

// ✅ NORMALISASI NAMA: Menyamakan format nama (spasi, garis bawah, ejaan) agar sinkron dengan halaman Aktivitas
const normalizeNamaKey = (namaRaw: string) => {
  const clean = String(namaRaw || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()

  const parts = clean.split(' ')
  if (parts.length === 0) return ''
  const first = parts[0]
    .replace(/K/g, 'C')
    .replace(/Y/g, 'I')
    .replace(/([A-Z])\1+/g, '$1')
  const rest = parts.slice(1).join(' ')
  return `${first} ${rest}`.trim()
}

export async function autoResetHarian(db: any, tokoId: string) {
  const now = new Date()
  const today = getTodayKey(now)
  const jamSekarang = now.getHours()
  const menitSekarang = now.getMinutes()
  const tglIndo = getTanggalIndo(now)
  let berubah = false

  // =====================================================================
  // 1. AUTO RESET HARIAN (Tengah Malam 00.01)
  // Berjalan hanya jika sudah lewat jam 00.01
  // =====================================================================
  const sudahLewatJam00 = (jamSekarang > 0) || (jamSekarang === 0 && menitSekarang >= 1)

  if (sudahLewatJam00) {
    const txHarian = await runTransaction(ref(db, `toko/${tokoId}/lastResetDate`), (curr) =>
      curr === today ? undefined : today
    )

    if (txHarian.committed) {
      await update(ref(db), {
        [`toko/${tokoId}/antrian`]: null,
        [`toko/${tokoId}/lastResetTimestamp`]: Date.now(),
        // Hapus kunci reset istirahat agar besok bisa jalan lagi
        [`toko/${tokoId}/lastResetIstirahat_13`]: null,
        [`toko/${tokoId}/lastResetIstirahat_16`]: null,
      })
      berubah = true
    }
  }

  // =====================================================================
  // 2. AUTO RESET ISTIRAHAT GELOMBANG 1 (Jam 13.00)
  // =====================================================================
  if (jamSekarang >= 13) {
    const marker13 = `${today}_13`
    const tx13 = await runTransaction(ref(db, `toko/${tokoId}/lastResetIstirahat_13`), (curr) =>
      curr === marker13 ? undefined : marker13
    )

    if (tx13.committed) {
      const [antrianSnap, checkinSnap] = await Promise.all([
        get(ref(db, `toko/${tokoId}/antrian`)),
        get(ref(db, `toko/${tokoId}/checkinHarian`)),
      ])

      const antrian = antrianSnap.val() || {}
      const checkin = checkinSnap.val() || {}
      const updates: Record<string, any> = {}
      const logs: any[] = []

      // Buat "Kamus" data check-in hari ini berdasarkan nama yang sudah dinormalisasi
      const mapCheckinHariIni = new Map<string, number>()
      Object.keys(checkin).forEach(promotorKey => {
        const dataHariIni = checkin[promotorKey]?.[today]
        if (dataHariIni?.waktu && dataHariIni?.nama) {
          const namaUnik = normalizeNamaKey(dataHariIni.nama)
          mapCheckinHariIni.set(namaUnik, Number(dataHariIni.waktu))
        }
      })

      const batas12 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0).getTime()

      Object.keys(antrian).forEach((key) => {
        const item = antrian[key]
        if (!item?.nama || item.status !== 'Standby') return

        const namaUnik = normalizeNamaKey(item.nama)
        const waktuCheckin = mapCheckinHariIni.get(namaUnik)

        // ✅ PENGAMAN MUTLAK: Jika waktu check-in tidak ditemukan, JANGAN dikeluarkan.
        if (!waktuCheckin) return

        // Keluarkan jika check-in SEBELUM jam 12.00
        if (waktuCheckin < batas12) {
          updates[`toko/${tokoId}/antrian/${key}`] = null
          logs.push({
            nama: item.nama,
            aksi: 'KeluarAntrian',
            waktu: Date.now(),
            tanggal: tglIndo,
            tanggalKey: today,
            hasil: 'Auto Reset Istirahat 13.00'
          })
        }
      })

      if (Object.keys(updates).length > 0) {
        await update(ref(db), updates)
        for (const log of logs) await push(ref(db, `toko/${tokoId}/statistikAktivitas`), log)
      }
      berubah = true
    }
  }

  // =====================================================================
  // 3. AUTO RESET ISTIRAHAT GELOMBANG 2 (Jam 16.00)
  // =====================================================================
  if (jamSekarang >= 16) {
    const marker16 = `${today}_16`
    const tx16 = await runTransaction(ref(db, `toko/${tokoId}/lastResetIstirahat_16`), (curr) =>
      curr === marker16 ? undefined : marker16
    )

    if (tx16.committed) {
      const [antrianSnap, checkinSnap] = await Promise.all([
        get(ref(db, `toko/${tokoId}/antrian`)),
        get(ref(db, `toko/${tokoId}/checkinHarian`)),
      ])

      const antrian = antrianSnap.val() || {}
      const checkin = checkinSnap.val() || {}
      const updates: Record<string, any> = {}
      const logs: any[] = []

      const mapCheckinHariIni = new Map<string, number>()
      Object.keys(checkin).forEach(promotorKey => {
        const dataHariIni = checkin[promotorKey]?.[today]
        if (dataHariIni?.waktu && dataHariIni?.nama) {
          const namaUnik = normalizeNamaKey(dataHariIni.nama)
          mapCheckinHariIni.set(namaUnik, Number(dataHariIni.waktu))
        }
      })

      const batas12 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0).getTime()

      Object.keys(antrian).forEach((key) => {
        const item = antrian[key]
        if (!item?.nama || item.status !== 'Standby') return

        const namaUnik = normalizeNamaKey(item.nama)
        const waktuCheckin = mapCheckinHariIni.get(namaUnik)

        // ✅ PENGAMAN MUTLAK: Jika waktu check-in tidak ditemukan, JANGAN dikeluarkan.
        if (!waktuCheckin) return

        // Keluarkan jika check-in MULAI jam 12.00 ke atas
        if (waktuCheckin >= batas12) {
          updates[`toko/${tokoId}/antrian/${key}`] = null
          logs.push({
            nama: item.nama,
            aksi: 'KeluarAntrian',
            waktu: Date.now(),
            tanggal: tglIndo,
            tanggalKey: today,
            hasil: 'Auto Reset Istirahat 16.00'
          })
        }
      })

      if (Object.keys(updates).length > 0) {
        await update(ref(db), updates)
        for (const log of logs) await push(ref(db, `toko/${tokoId}/statistikAktivitas`), log)
      }
      berubah = true
    }
  }

  return berubah
}