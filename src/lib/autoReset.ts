import { get, ref, runTransaction, update } from 'firebase/database'

const pad = (n: number) => String(n).padStart(2, '0')
export const getTodayKey = (d = new Date()) => {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const cleanNama = (nama: string) => nama.trim().toLowerCase().replace(/\s+/g, '_')

const getBatasJam = (now: Date, jam: 13 | 16) => {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), jam, 0, 0, 0).getTime()
}

async function prosesGelombangIstirahat(
  db: any,
  tokoId: string,
  now: Date,
  today: string,
  gelombang: '13' | '16'
) {
  const marker = `${today}_${gelombang}`
  const tx = await runTransaction(
    ref(db, `toko/${tokoId}/lastResetIstirahat_${gelombang}`),
    (curr) => (curr === marker ? undefined : marker)
  )
  if (!tx.committed) return false

  const batasTs = getBatasJam(now, gelombang === '13' ? 13 : 16)
  const [antrianSnap, checkinSnap] = await Promise.all([
    get(ref(db, `toko/${tokoId}/antrian`)),
    get(ref(db, `toko/${tokoId}/checkinHarian`)),
  ])

  const antrian = antrianSnap.val() || {}
  const checkin = checkinSnap.val() || {}
  const updates: Record<string, any> = {}

  Object.keys(antrian).forEach((key) => {
    const item = antrian[key]
    if (!item?.nama) return

    const clean = item._key ? cleanNama(item._key) : cleanNama(item.nama) || key
    const waktuCheckin = Number(checkin?.[clean]?.[today]?.waktu || 0)
    const waktuMasuk = Number(item.waktuMasukAntrian || 0)

    // Check-in atau masuk antrian setelah jam gelombang (misal check-in siang >= 13.00) tidak kena reset gelombang ini
    if (gelombang === '13' && waktuCheckin >= batasTs) return
    if (waktuMasuk > 0 && waktuMasuk >= batasTs) return

    const status = String(item.status || '')
    if (status === 'Standby') {
      updates[`toko/${tokoId}/antrian/${key}`] = null
    } else if (status === 'Melayani' || status === 'Ibadah' || status === 'Dipanggil CS') {
      updates[`toko/${tokoId}/checkinHarian/${clean}/${today}/nama`] = item.nama
      updates[`toko/${tokoId}/checkinHarian/${clean}/${today}/tanggalKey`] = today
      updates[`toko/${tokoId}/checkinHarian/${clean}/${today}/terlewatReset_${gelombang}`] = true
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
  let berubah = false

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

  const jam = now.getHours()
  if (jam >= 13 && (await prosesGelombangIstirahat(db, tokoId, now, today, '13'))) {
    berubah = true
  }
  if (jam >= 16 && (await prosesGelombangIstirahat(db, tokoId, now, today, '16'))) {
    berubah = true
  }

  return berubah
}