import { useEffect } from 'react'
import { db } from '@/lib/firebase'
import { autoResetHarian } from '@/lib/autoReset'

export function useAutoReset(tokoId?: string) {
  useEffect(() => {
    if (!tokoId) return
    const run = () => autoResetHarian(db, tokoId).catch(console.error)
    run()
    const t = setInterval(run, 60_000) // cek tiap menit, menangkap pergantian hari
    return () => clearInterval(t)
  }, [tokoId])
}