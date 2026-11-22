'use client'

import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '@/lib/firebase'

export interface AntrianItem {
  _key?: string
  nama: string
  status: 'Standby' | 'Melayani' | 'Dipanggil CS' | 'Ibadah'
  kategori: 'HA' | 'AV'
  subkategori?: string
  waktuStandby: number
  waktuMulaiMelayani?: number
  waktuStandbySebelumIbadah?: number
  waktuStandbySebelumCS?: number
  posisiTerkunci?: number
}

export interface SettingToko {
  namaToko?: string
  namaSistem?: string
  statusAntrian?: 'BUKA' | 'TUTUP'
  latToko?: number
  lngToko?: number
  radiusToko?: number
  lat?: number
  lng?: number
  radiusMaks?: number
}

export function useAntrian(tokoId: string) {
  const [antrian, setAntrian] = useState<AntrianItem[]>([])
  const [setting, setSetting] = useState<SettingToko | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tokoId) return

    setLoading(true)

    // 1. Ambil data antrian realtime
    const antrianRef = ref(db, `toko/${tokoId}/antrian`)
    const unsubAntrian = onValue(antrianRef, (snapshot) => {
      const data = snapshot.val()
      const list: AntrianItem[] = []

      if (data) {
        Object.keys(data).forEach((key) => {
          const item = data[key]
          if (item && item.nama) {
            const kategoriNorm = String(item.kategori || item.subkategori || 'HA').toUpperCase() === 'AV' ? 'AV' : 'HA'
            list.push({
              ...item,
              _key: key,
              kategori: kategoriNorm,
              waktuStandby: Number(item.waktuStandby) || 0,
            })
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
        // Default jika belum ada setting di database
        setSetting({
          statusAntrian: 'BUKA',
          namaToko: process.env.NEXT_PUBLIC_NAMA_TOKO || 'TOKO',
        })
      }
    })

    return () => {
      unsubAntrian()
      unsubSetting()
    }
  }, [tokoId])

  return { antrian, setting, loading }
}