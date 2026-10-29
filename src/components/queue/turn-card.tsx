import { Hourglass, UserRound } from 'lucide-react'

type TurnCardProps = {
  type: string
  label: string
  holder: string | null
}

export function TurnCard({ type, label, holder }: TurnCardProps) {
  return (
    <article className="flex flex-col gap-4 rounded-3xl bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-primary/15 px-2.5 py-1 font-mono text-xs font-bold text-primary">
          {type}
        </span>
        {holder ? (
          <UserRound className="size-4 text-accent" aria-hidden="true" />
        ) : (
          <Hourglass className="size-4 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          aria-live="polite"
          className={`mt-1 truncate text-lg font-semibold ${holder ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {holder ?? 'Belum ada'}
        </p>
      </div>
    </article>
  )
}
