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
    const unsub = onValue(
      ref(db, 'toko/ufo-kebonsari/setting'),
      (snap) => {
        const data = snap.val()
        if (data) {
          setSetting({
            namaSistem: data.namaSistem || 'ANTRIAN WALK-IN PROMOTOR',
            namaToko: data.namaToko || 'UFO MALANG KEBONSARI'
          })
        }
      },
      () => {} // sebelum login, rules menolak baca: pakai teks bawaan
    )
    return () => unsub()
  }, [])

  return (
    <section className="flex flex-col items-center justify-center text-center w-full">
      <div className="relative motion-safe:animate-[float_5s_ease-in-out_infinite]">
        <div aria-hidden="true" className="absolute inset-0 rounded-[24px] blur-2xl opacity-40 bg-sky-500" />
        <div className="relative flex size-20 items-center justify-center overflow-hidden rounded-[22px] bg-white dark:bg-slate-900 border border-border p-2 shadow-xl shadow-sky-500/30">
          <Image
            src="/logo-ufo.png"
            alt="UFO Elektronika"
            width={80}
            height={80}
            className="object-contain"
            priority
          />
        </div>
      </div>

      <h1 className="mt-4 text-lg md:text-2xl font-extrabold tracking-tight text-foreground text-center uppercase leading-tight">
        {setting.namaSistem}
      </h1>

      <p className="mt-1.5 text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {setting.namaToko}
      </p>

      {/* Badge disembunyikan di layar pendek supaya tetap muat */}
      <ul className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-semibold [@media(max-height:680px)]:hidden">
        {features.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-foreground border border-border shadow-sm font-medium"
          >
            <Icon className="size-3.5 text-cyan-500" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </section>
  )
}