import { MapPin, Users, Zap } from 'lucide-react'
import Image from 'next/image'

const features = [
  { icon: Users, label: 'Antrian promotor' },
  { icon: MapPin, label: 'Validasi lokasi' },
  { icon: Zap, label: 'Real-time' },
]

export function LoginBrand() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center text-center mt-10">
      <div className="relative motion-safe:animate-[float_5s_ease-in-out_infinite]">
        {/* Efek Cahaya Biru Paksa (Hex Color) di belakang logo */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-[28px] blur-2xl opacity-50"
          style={{ backgroundColor: '#0ea5e9' }} // Biru Cyan Solid
        />
        
        {/* Logo UFO */}
        <div 
          className="relative flex size-28 items-center justify-center overflow-hidden rounded-[28px] bg-transparent shadow-2xl" 
          style={{ boxShadow: '0 10px 30px -5px rgba(14, 165, 233, 0.5)' }} // Shadow biru
        >
          <Image 
            src="/logo-ufo.png" 
            alt="UFO Elektronika" 
            width={112} 
            height={112} 
            className="object-contain"
            priority
          />
        </div>
      </div>

      <h1 className="mt-8 text-balance text-3xl font-extrabold tracking-tight text-foreground">
        Antrian Walk-In Promotor
      </h1>
      <p className="mt-2 text-sm font-medium text-muted-foreground">
        {'UFO Malang · Kebonsari'}
      </p>

      <ul className="mt-8 flex flex-wrap justify-center gap-2 text-xs font-semibold">
        {features.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-muted-foreground border border-border"
          >
            <Icon className="size-3.5 text-cyan-500" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </section>
  )
}