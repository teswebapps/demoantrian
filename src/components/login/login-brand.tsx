import { MapPin, Users, Zap } from 'lucide-react'
import Image from 'next/image'

const features = [
  { icon: Users, label: 'Antrian promotor' },
  { icon: MapPin, label: 'Validasi lokasi' },
  { icon: Zap, label: 'Real-time' },
]

export function LoginBrand() {
  return (
    <section className="flex flex-col items-center justify-center text-center">
      <div className="relative motion-safe:animate-[float_5s_ease-in-out_infinite]">
        {/* Efek Cahaya Biru di belakang logo */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-[28px] blur-2xl opacity-50"
          style={{ backgroundColor: '#0ea5e9' }} 
        />
        
        {/* Logo UFO (Ukuran sedikit diperkecil untuk HP) */}
        <div 
          className="relative flex size-20 items-center justify-center overflow-hidden rounded-[24px] bg-transparent shadow-2xl sm:size-24" 
          style={{ boxShadow: '0 10px 30px -5px rgba(14, 165, 233, 0.5)' }}
        >
          <Image 
            src="/logo-ufo.png" 
            alt="UFO Elektronika" 
            width={80} 
            height={80} 
            className="object-contain sm:w-24 sm:h-24"
            priority
          />
        </div>
      </div>

      {/* Jarak judul dikurangi */}
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground sm:mt-6 sm:text-3xl">
        Sistem Antrian Promotor
      </h1>
      <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
        {'UFO Malang · Kebonsari'}
      </p>

      {/* Jarak fitur dikurangi */}
      <ul className="mt-4 flex flex-wrap justify-center gap-1.5 text-[10px] font-semibold sm:mt-6 sm:gap-2 sm:text-xs">
        {features.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-muted-foreground border border-border sm:px-3 sm:py-1.5"
          >
            <Icon className="size-3 text-cyan-500 sm:size-3.5" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </section>
  )
}