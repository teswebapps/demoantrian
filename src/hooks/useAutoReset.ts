'use client'

import { useEffect } from 'react'
import { db } from '@/lib/firebase'
import { autoResetHarian } from '@/lib/autoReset'

export function useAutoReset(tokoId?: string) {
  useEffect(() => {
    if (!tokoId) return

    let active = true
    const run = () => {
      if (!active) return
      autoResetHarian(db, tokoId).catch((err) => {
        if (active) console.error(err)
      })
    }

    run()
    const t = setInterval(run, 60_000) // cek tiap menit, menangkap pergantian hari

    return () => {
      active = false
      clearInterval(t)
    }
  }, [tokoId])
}