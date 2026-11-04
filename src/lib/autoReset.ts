import { ref, runTransaction, update } from 'firebase/database'

const pad = (n: number) => String(n).padStart(2, '0')
export const getTodayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export async function autoResetHarian(db: any, tokoId: string) {
  const today = getTodayKey()

  // Transaction: hanya satu client yang "menang" per hari
  const res = await runTransaction(ref(db, `toko/${tokoId}/lastResetDate`), (current) => {
    if (current === today) return // abort, sudah di-reset hari ini
    return today
  })
  if (!res.committed) return false

  await update(ref(db), {
    [`toko/${tokoId}/antrian`]: null,
    [`toko/${tokoId}/checkinHarian`]: null,
    [`toko/${tokoId}/lastResetTimestamp`]: Date.now(),
  })
  return true
}