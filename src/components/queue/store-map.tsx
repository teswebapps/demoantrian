'use client'

import 'leaflet/dist/leaflet.css'
import { Circle, CircleMarker, MapContainer, TileLayer } from 'react-leaflet'

type StoreMapProps = {
  center: [number, number]
  radius: number
}

export function StoreMap({ center, radius }: StoreMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={17}
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl
      className="size-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles-dark"
      />
      <Circle
        center={center}
        radius={radius}
        pathOptions={{ color: '#5cc8f0', weight: 1.5, fillColor: '#5cc8f0', fillOpacity: 0.15 }}
      />
      <CircleMarker
        center={center}
        radius={9}
        pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#f05252', fillOpacity: 1 }}
      />
    </MapContainer>
  )
}
