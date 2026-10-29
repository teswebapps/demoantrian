'use client'

import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'

const StoreMap = dynamic(() => import('./store-map').then((m) => m.StoreMap), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-secondary" />,
})

export const STORE_POSITION: [number, number] = [-8.0098, 112.6282]
export const STORE_RADIUS_METERS = 100

export function StoreMapCard() {
  return (
    <section aria-labelledby="map-heading" className="overflow-hidden rounded-3xl bg-card">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
            <MapPin className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="map-heading" className="text-sm font-semibold text-foreground">
              Posisi toko
            </h2>
            <p className="text-xs text-muted-foreground">Radius absen {STORE_RADIUS_METERS} m</p>
          </div>
        </div>
        <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
          Dalam area
        </span>
      </div>
      <div className="relative mx-2 mb-2 h-52 overflow-hidden rounded-2xl">
        <StoreMap center={STORE_POSITION} radius={STORE_RADIUS_METERS} />
      </div>
    </section>
  )
}
