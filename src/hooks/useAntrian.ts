'use client'

import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '@/lib/firebase'

export interface AntrianItem {
  nama: string
  status: 'Standby' | 'Melayani' | 'Dipanggil CS' | 'Ibadah'
  kategori: 'HA' | 'AV'
  waktuStandby: number
  waktuMulaiMelayani?: number
}

export interface SettingToko {
  namaToko?: string
  namaSistem?: string
  statusAntrian?: 'BUKA' | 'TUTUP'
  latToko?: number
  lngToko?: number
  radiusToko?: number
}

export function useAntrian(tokoId: string) {
  const [antrian, setAntrian] = useState<AntrianItem[]>([])
  const [setting, setSetting] = useState<SettingToko | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tokoId) return

    // 1. Ambil data antrian realtime
    const antrianRef = ref(db, `toko/${tokoId}/antrian`)
    const unsubAntrian = onValue(antrianRef, (snapshot) => {
      const data = snapshot.val()
      const list: AntrianItem[] = []
      
      if (data) {
        Object.keys(data).forEach((key) => {
          if (data[key] && data[key].nama) {
            list.push(data[key])
          }
        })
      }
      
      // Urutkan berdasarkan waktu standby (yang paling lama duluan)
      list.sort((a, b) => (a.waktuStandby || 0) - (b.waktuStandby || 0))
      setAntrian(list)
      setLoading(false)
    })

    // 2. Ambil data setting toko realtime
    const settingRef = ref(db, `toko/${tokoId}/setting`)
    const unsubSetting = onValue(settingRef, (snapshot) => {
      if (snapshot.exists()) {
        setSetting(snapshot.val())
      } else {
        // Default jika belum ada setting
        setSetting({ statusAntrian: 'BUKA', namaToko: 'UFO Kebonsari' })
      }
    })

    return () => {
      unsubAntrian()
      unsubSetting()
    }
  }, [tokoId])

  return { antrian, setting, loading }
}