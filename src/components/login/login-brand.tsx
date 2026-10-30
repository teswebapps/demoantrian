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
        {/* Efek Cahaya Biru di belakang logo */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-[28px] bg-cyan-500/30 blur-2xl"
        />
        {/* Logo UFO */}
        <div className="relative flex size-28 items-center justify-center overflow-hidden rounded-[28px] bg-transparent shadow-xl shadow-cyan-900/40">
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
        Sistem Antrian
      </h1>
      <p className="mt-2 text-sm font-medium text-muted-foreground">
        {'UFO Elektronika · Kebonsari'}
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