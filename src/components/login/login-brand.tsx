'use client'

import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { MapPin, Users, Zap } from 'lucide-react'
import Image from 'next/image'

const features = [
  { icon: Users, label: 'Antrian promotor' },
  { icon: MapPin, label: 'Validasi lokasi' },
  { icon: Zap, label: 'Real-time' },
]

export function LoginBrand() {
  const [setting, setSetting] = useState({
    namaSistem: 'ANTRIAN WALK-IN PROMOTOR',
    namaToko: 'UFO MALANG KEBONSARI'
  })

  useEffect(() => {
    const unsub = onValue(ref(db, 'toko/ufo-kebonsari/setting'), (snap) => {
      const data = snap.val()
      if (data) {
        setSetting({
          namaSistem: data.namaSistem || 'ANTRIAN WALK-IN PROMOTOR',
          namaToko: data.namaToko || 'UFO MALANG KEBONSARI'
        })
      }
    })
    return () => unsub()
  }, [])

  return (
    <section className="flex flex-col items-center justify-center text-center w-full">
      <div className="relative motion-safe:animate-[float_5s_ease-in-out_infinite]">
        {/* Efek Cahaya Biru */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-[28px] blur-2xl opacity-50"
          style={{ backgroundColor: '#0ea5e9' }} 
        />
        
        {/* Logo UFO */}
        <div 
          className="relative flex size-24 items-center justify-center overflow-hidden rounded-[24px] bg-transparent shadow-2xl" 
          style={{ boxShadow: '0 10px 30px -5px rgba(14, 165, 233, 0.5)' }}
        >
          <Image 
            src="/logo-ufo.png" 
            alt="UFO Elektronika" 
            width={96} 
            height={96} 
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Nama Sistem dari Pengaturan */}
      <h1 className="mt-6 text-xl md:text-2xl font-extrabold tracking-tight text-white text-center uppercase leading-tight">
        {setting.namaSistem}
      </h1>
      
      {/* Nama Toko dari Pengaturan */}
      <p className="mt-2 text-xs md:text-sm font-semibold text-slate-300 uppercase tracking-wide">
        {setting.namaToko}
      </p>

      {/* Badge Fitur dengan Efek Timbul 3D */}
      <ul className="mt-5 flex flex-wrap justify-center gap-2 text-xs font-semibold">
        {features.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-4 py-2 text-slate-200 border border-slate-700/80 shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] font-medium"
          >
            <Icon className="size-3.5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </section>
  )
}