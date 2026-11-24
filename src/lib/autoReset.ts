import { get, push, ref, runTransaction, update } from 'firebase/database'

const pad = (n: number) => String(n).padStart(2, '0')
export const getTodayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const getTanggalIndo = (d = new Date()) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
const cleanNama = (nama: string) => nama.trim().toLowerCase().replace(/\s+/g, '_')

export async function autoResetHarian(db: any, tokoId: string) {
  const now = new Date()
  const today = getTodayKey(now)
  const jamSekarang = now.getHours()
  const tglIndo = getTanggalIndo(now)
  let berubah = false

  // 1. AUTO RESET HARIAN (Tengah Malam)
  const txHarian = await runTransaction(ref(db, `toko/${tokoId}/lastResetDate`), (curr) =>
    curr === today ? undefined : today
  )

  if (txHarian.committed) {
    await update(ref(db), {
      [`toko/${tokoId}/antrian`]: null,
      [`toko/${tokoId}/checkinHarian`]: null,
      [`toko/${tokoId}/lastResetTimestamp`]: Date.now(),
      [`toko/${tokoId}/lastResetIstirahat_13`]: null,
      [`toko/${tokoId}/lastResetIstirahat_16`]: null,
    })
    berubah = true
  }

  // 2. AUTO RESET ISTIRAHAT GELOMBANG 1 (Jam 13.00)
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

      const batas12 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0).getTime()

      Object.keys(antrian).forEach((key) => {
        const item = antrian[key]
        if (!item?.nama || item.status !== 'Standby') return

        const clean = cleanNama(item.nama)
        const waktuCheckin = Number(checkin?.[clean]?.[today]?.waktu || item.waktuMasukAntrian || 0)
        if (!waktuCheckin) return

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

  // 3. AUTO RESET ISTIRAHAT GELOMBANG 2 (Jam 16.00)
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

      const batas12 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0).getTime()

      Object.keys(antrian).forEach((key) => {
        const item = antrian[key]
        if (!item?.nama || item.status !== 'Standby') return

        const clean = cleanNama(item.nama)
        const waktuCheckin = Number(checkin?.[clean]?.[today]?.waktu || item.waktuMasukAntrian || 0)
        if (!waktuCheckin) return

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