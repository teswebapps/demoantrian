'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix ikon Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const isValidCoord = (lat: unknown, lng: unknown): lat is number => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  )
}

export default function MapComponent({
  tokoLat,
  tokoLng,
  radius,
  userLat,
  userLng,
}: {
  tokoLat: number
  tokoLng: number
  radius: number
  userLat?: number | null
  userLng?: number | null
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerGroupRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !isValidCoord(tokoLat, tokoLng)) return

    if (!mapRef.current) {
      const map = L.map(el, {
        center: [tokoLat, tokoLng],
        zoom: 17,
        zoomControl: true,
      })

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      layerGroupRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
    }

    const map = mapRef.current
    const group = layerGroupRef.current
    if (!map || !group) return

    group.clearLayers()

    L.marker([tokoLat, tokoLng]).addTo(group)

    const safeRadius = typeof radius === 'number' && Number.isFinite(radius) && radius > 0 ? radius : 50
    L.circle([tokoLat, tokoLng], {
      radius: safeRadius,
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.2,
    }).addTo(group)

    if (isValidCoord(userLat ?? null, userLng ?? null)) {
      L.circleMarker([userLat as number, userLng as number], {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: '#2563eb',
        fillOpacity: 1,
      }).addTo(group)
    }

    const timer = setTimeout(() => {
      try {
        map.invalidateSize()
        map.setView([tokoLat, tokoLng], map.getZoom(), { animate: false })
      } catch {
        // Abaikan jika instance sedang di-unmount
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [tokoLat, tokoLng, radius, userLat, userLng])

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove()
        } catch {
          // Abaikan saat cleanup
        }
        mapRef.current = null
        layerGroupRef.current = null
      }
    }
  }, [])

  if (!isValidCoord(tokoLat, tokoLng)) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary/50 text-xs text-muted-foreground rounded-2xl">
        Memuat koordinat peta...
      </div>
    )
  }

  return <div ref={containerRef} className="w-full h-full relative z-0" />
}