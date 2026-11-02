'use client'

import { MapContainer, TileLayer, Marker, Circle, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix ikon Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

export default function MapComponent({
  tokoLat, tokoLng, radius, userLat, userLng,
}: {
  tokoLat: number, tokoLng: number, radius: number,
  userLat?: number | null, userLng?: number | null
}) {
  return (
    <div className="w-full h-full relative z-0">
      <MapContainer center={[tokoLat, tokoLng]} zoom={17} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <Marker position={[tokoLat, tokoLng]} />
        <Circle
          center={[tokoLat, tokoLng]}
          radius={radius}
          pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.2 }}
        />
        {userLat != null && userLng != null && (
          <CircleMarker
            center={[userLat, userLng]}
            radius={8}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 }}
          />
        )}
      </MapContainer>
    </div>
  )
}
