'use client'

import { useState } from 'react'
import { Hand } from 'lucide-react'

export type QueueType = 'HA' | 'AV'

const OPTIONS: { value: QueueType; label: string }[] = [
  { value: 'HA', label: 'HA' },
  { value: 'AV', label: 'AV' },
]

type ActionBarProps = {
  disabled?: boolean
  onTakeTurn: (type: QueueType) => void
}

export function ActionBar({ disabled, onTakeTurn }: ActionBarProps) {
  const [selected, setSelected] = useState<QueueType>('HA')

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000] mx-auto w-full max-w-md bg-gradient-to-t from-background via-background to-background/0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
      <div className="flex flex-col gap-3 rounded-3xl bg-card p-2 shadow-2xl shadow-black/40">
        <div role="radiogroup" aria-label="Pilih kategori" className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
          {OPTIONS.map((option) => {
            const active = selected === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(option.value)}
                className={`h-11 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onTakeTurn(selected)}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
        >
          <Hand className="size-5" aria-hidden="true" />
          Ambil giliran {selected}
        </button>
      </div>
    </div>
  )
}
