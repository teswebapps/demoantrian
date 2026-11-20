import { get, ref, runTransaction, update } from 'firebase/database'

const pad = (n: number) => String(n).padStart(2, '0')
export const getTodayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const cleanNama = (nama: string) => nama.trim().toLowerCase().replace(/\s+/g, '_')

async function prosesResetIstirahatGelombang(
  db: any,
  tokoId: string,
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

  const [antrianSnap, settingSnap] = await Promise.all([
    get(ref(db, `toko/${tokoId}/antrian`)),
    get(ref(db, `toko/${tokoId}/setting`)),
  ])

  const antrianData = antrianSnap.val() || {}
  const settingData = settingSnap.val() || {}
  const durasiMenit = Number(settingData?.durasiLockIstirahat || settingData?.durasiLock || 60) || 60
  const alasan =
    settingData?.alasanLockIstirahat ||
    `Tidak keluar antrian saat reset istirahat (${gelombang}.00)`

  const updates: Record<string, any> = {}

  Object.keys(antrianData).forEach((key) => {
    const item = antrianData[key]
    if (!item || !item.nama) return
    const clean = item._key ? cleanNama(item._key) : cleanNama(item.nama) || key
    const status = String(item.status || '')

    if (status === 'Standby') {
      updates[`toko/${tokoId}/antrian/${key}`] = null
    } else if (status === 'Melayani' || status === 'Ibadah' || status === 'Dipanggil CS') {
      const checkinBase = `toko/${tokoId}/checkinHarian/${clean}/${today}`
      updates[`${checkinBase}/nama`] = item.nama
      updates[`${checkinBase}/tanggalKey`] = today
      updates[`${checkinBase}/terlewatReset_${gelombang}`] = true
      updates[`${checkinBase}/terlewatResetDurasi_${gelombang}`] = durasiMenit
      updates[`${checkinBase}/terlewatResetAlasan_${gelombang}`] = alasan
    }
  })

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates)
  }

  return true
}

export async function autoResetHarian(db: any, tokoId: string) {
  const now = new Date()
  const today = getTodayKey()
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
  if (jam >= 16) {
    const reset16 = await prosesResetIstirahatGelombang(db, tokoId, today, '16')
    if (reset16) adaPerubahan = true
  } else if (jam >= 13) {
    const reset13 = await prosesResetIstirahatGelombang(db, tokoId, today, '13')
    if (reset13) adaPerubahan = true
  }

  return adaPerubahan
}