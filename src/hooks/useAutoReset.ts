'use client'

import { useEffect } from 'react'
import { db } from '@/lib/firebase'
import { autoResetHarian } from '@/lib/autoReset'

export function useAutoReset(tokoId?: string) {
  useEffect(() => {
    if (!tokoId) return

    let aktif = true
    let sedangProses = false

    const cek = async () => {
      if (!aktif || sedangProses) return
      sedangProses = true
      try {
        await autoResetHarian(db, tokoId)
      } catch (err) {
        console.error('Auto reset error:', err)
      } finally {
        sedangProses = false
      }
    }

    cek()
    const interval = setInterval(cek, 30_000)

    return () => {
      aktif = false
      clearInterval(interval)
    }
  }, [tokoId])
}