import { get, ref, runTransaction, update } from 'firebase/database'

const pad = (n: number) => String(n).padStart(2, '0')
export const getTodayKey = (d = new Date()) => {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const cleanNama = (nama: string) => nama.trim().toLowerCase().replace(/\s+/g, '_')

const getBatasTimestampGelombang = (now: Date, gelombang: '13' | '16') => {
  const jam = gelombang === '13' ? 13 : 16
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), jam, 0, 0, 0).getTime()
}

async function prosesResetIstirahatGelombang(
  db: any,
  tokoId: string,
  now: Date,
  today: string,
  gelombang: '13' | '16'
) {
  const markerKey = `${today}_${gelombang}`
  const res = await runTransaction(
    ref(db, `toko/${tokoId}/lastResetIstirahat_${gelombang}`),
    (current) => {
      if (current === markerKey) return
      return markerKey
    }
  )
  if (!res.committed) return false

  const batasTs = getBatasTimestampGelombang(now, gelombang)

  const [antrianSnap, checkinHariIniSnap] = await Promise.all([
    get(ref(db, `toko/${tokoId}/antrian`)),
    get(ref(db, `toko/${tokoId}/checkinHarian`)),
  ])

  const antrianData = antrianSnap.val() || {}
  const checkinAllData = checkinHariIniSnap.val() || {}
  const updates: Record<string, any> = {}

  Object.keys(antrianData).forEach((key) => {
    const item = antrianData[key]
    if (!item || !item.nama) return

    const clean = item._key ? cleanNama(item._key) : cleanNama(item.nama) || key
    const checkinRecord = checkinAllData?.[clean]?.[today] || {}
    const waktuCheckin = Number(checkinRecord.waktu || 0)
    const waktuMasuk = Number(item.waktuMasukAntrian || 0)

    // Jika check-in siang (>= 13.00) maka gelombang 13 dilewati
    if (gelombang === '13' && waktuCheckin >= batasTs) return
    // Jika masuk antrian setelah batas jam gelombang (misal check-in siang > 13.00), jangan kena reset gelombang ini
    if (waktuMasuk > 0 && waktuMasuk >= batasTs) return

    const status = String(item.status || '')

    if (status === 'Standby') {
      updates[`toko/${tokoId}/antrian/${key}`] = null
    } else if (status === 'Melayani' || status === 'Ibadah' || status === 'Dipanggil CS') {
      const checkinBase = `toko/${tokoId}/checkinHarian/${clean}/${today}`
      updates[`${checkinBase}/nama`] = item.nama
      updates[`${checkinBase}/tanggalKey`] = today
      updates[`${checkinBase}/terlewatReset_${gelombang}`] = true
    }
  })

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates)
  }

  return true
}

export async function autoResetHarian(db: any, tokoId: string) {
  const now = new Date()
  const today = getTodayKey(now)
  let adaPerubahan = false

  // Transaction: hanya satu client yang "menang" per hari
  const res = await runTransaction(ref(db, `toko/${tokoId}/lastResetDate`), (current) => {
    if (current === today) return // abort, sudah di-reset hari ini
    return today
  })

  if (res.committed) {
    await update(ref(db), {
      [`toko/${tokoId}/antrian`]: null,
      [`toko/${tokoId}/checkinHarian`]: null,
      [`toko/${tokoId}/lastResetTimestamp`]: Date.now(),
    })
    adaPerubahan = true
  }

  const jam = now.getHours()
  if (jam >= 13) {
    const reset13 = await prosesResetIstirahatGelombang(db, tokoId, now, today, '13')
    if (reset13) adaPerubahan = true
  }
  if (jam >= 16) {
    const reset16 = await prosesResetIstirahatGelombang(db, tokoId, now, today, '16')
    if (reset16) adaPerubahan = true
  }

  return adaPerubahan
}