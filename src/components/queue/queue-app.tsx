'use client'

import { useState } from 'react'
import { AppHeader } from './app-header'
import { PromoterCard } from './promoter-card'
import { TurnCard } from './turn-card'
import { StoreMapCard } from './store-map-card'
import { ActionBar, type QueueType } from './action-bar'

type QueueAppProps = {
  storeName: string
  promoterName: string
}

export function QueueApp({ storeName, promoterName }: QueueAppProps) {
  const [isOpen] = useState(true)
  const [current, setCurrent] = useState<Record<QueueType, string | null>>({
    HA: null,
    AV: null,
  })

  function handleTakeTurn(type: QueueType) {
    setCurrent((prev) => ({ ...prev, [type]: promoterName }))
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <AppHeader storeName={storeName} isOpen={isOpen} />

      <main className="flex flex-1 flex-col gap-4 px-4 pb-44 pt-2">
        <PromoterCard name={promoterName} />

        <section aria-labelledby="turns-heading" className="flex flex-col gap-3">
          <h2
            id="turns-heading"
            className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Giliran saat ini
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <TurnCard type="HA" label="Home Appliance" holder={current.HA} />
            <TurnCard type="AV" label="Audio Video" holder={current.AV} />
          </div>
        </section>

        <StoreMapCard />
      </main>

      <ActionBar disabled={!isOpen} onTakeTurn={handleTakeTurn} />
    </div>
  )
}
