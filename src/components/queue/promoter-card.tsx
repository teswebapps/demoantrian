import { BadgeCheck } from 'lucide-react'

export function PromoterCard({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <section
      aria-label="Profil promotor"
      className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-primary/20 via-card to-card p-4"
    >
      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">Masuk sebagai promotor</p>
        <p className="flex items-center gap-1.5 truncate text-xl font-semibold text-foreground">
          {name}
          <BadgeCheck className="size-5 shrink-0 text-primary" aria-label="Terverifikasi" />
        </p>
      </div>
    </section>
  )
}
