import React, { useEffect, useRef, useState } from 'react'

const DEFAULT_CENTER = { lat: 24.4539, lng: 54.3773 }
const MAPS_SCRIPT_ID = 'adwest-google-maps-js'

type GoogleLatLng = { lat: number; lng: number }

interface GoogleMapsMap {
  setCenter: (pos: GoogleLatLng) => void
  addListener: (event: string, handler: (e: { latLng: { lat: () => number; lng: () => number } }) => void) => void
}

interface GoogleMapsMarker {
  setPosition: (pos: GoogleLatLng) => void
  getPosition: () => { lat: () => number; lng: () => number } | null
  addListener: (event: string, handler: () => void) => void
}

interface GoogleMapsAutocomplete {
  addListener: (event: string, handler: () => void) => void
  getPlace: () => {
    geometry?: { location?: { lat: () => number; lng: () => number } }
    formatted_address?: string
    url?: string
  }
}

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (el: HTMLElement, opts: Record<string, unknown>) => GoogleMapsMap
        Marker: new (opts: Record<string, unknown>) => GoogleMapsMarker
        LatLng: new (lat: number, lng: number) => GoogleLatLng
        event: { clearInstanceListeners: (instance: unknown) => void }
        places: {
          Autocomplete: new (input: HTMLInputElement, opts: Record<string, unknown>) => GoogleMapsAutocomplete
        }
      }
    }
  }
}

function parseLatLngFromLink(link: string): GoogleLatLng | null {
  const trimmed = link.trim()
  if (!trimmed) return null
  const qMatch = trimmed.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i)
  if (qMatch) return { lat: Number(qMatch[1]), lng: Number(qMatch[2]) }
  const atMatch = trimmed.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i)
  if (atMatch) return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) }
  return null
}

function buildGoogleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve()
  const existing = document.getElementById(MAPS_SCRIPT_ID) as HTMLScriptElement | null
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')), { once: true })
    })
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = MAPS_SCRIPT_ID
    script.async = true
    script.defer = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })
}

interface Props {
  apiKey?: string
  value: string
  onChange: (link: string) => void
  labelStyle?: React.CSSProperties
}

export const GoogleMapLocationPicker: React.FC<Props> = ({ apiKey, value, onChange, labelStyle }) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const mapInstance = useRef<GoogleMapsMap | null>(null)
  const markerInstance = useRef<GoogleMapsMarker | null>(null)
  const autocompleteInstance = useRef<GoogleMapsAutocomplete | null>(null)
  const [loadError, setLoadError] = useState('')
  const [ready, setReady] = useState(false)

  const resolvedKey = apiKey?.trim() || (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim()

  const setMarkerPosition = (pos: GoogleLatLng) => {
    markerInstance.current?.setPosition(pos)
    mapInstance.current?.setCenter(pos)
    onChange(buildGoogleMapsLink(pos.lat, pos.lng))
  }

  useEffect(() => {
    if (!resolvedKey || !mapRef.current) return

    let cancelled = false
    setLoadError('')
    void loadGoogleMapsScript(resolvedKey)
      .then(() => {
        if (cancelled || !mapRef.current || !window.google?.maps) return

        const initial = parseLatLngFromLink(value) ?? DEFAULT_CENTER
        const map = new window.google.maps.Map(mapRef.current, {
          center: initial,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        })
        const marker = new window.google.maps.Marker({
          map,
          position: initial,
          draggable: true,
        })

        map.addListener('click', (event) => {
          const lat = event.latLng.lat()
          const lng = event.latLng.lng()
          setMarkerPosition({ lat, lng })
        })

        marker.addListener('dragend', () => {
          const pos = marker.getPosition()
          if (!pos) return
          setMarkerPosition({ lat: pos.lat(), lng: pos.lng() })
        })

        if (searchRef.current && window.google.maps.places) {
          const autocomplete = new window.google.maps.places.Autocomplete(searchRef.current, {
            fields: ['geometry', 'formatted_address', 'url'],
          })
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace()
            const location = place.geometry?.location
            if (!location) return
            const lat = location.lat()
            const lng = location.lng()
            setMarkerPosition({ lat, lng })
            if (place.url) {
              onChange(place.url)
            }
          })
          autocompleteInstance.current = autocomplete
        }

        mapInstance.current = map
        markerInstance.current = marker
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Map could not be loaded. You can paste a Google Maps link below.')
      })

    return () => {
      cancelled = true
      if (markerInstance.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(markerInstance.current)
      }
      if (mapInstance.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(mapInstance.current)
      }
      markerInstance.current = null
      mapInstance.current = null
      autocompleteInstance.current = null
      setReady(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-init when API key becomes available
  }, [resolvedKey])

  if (!resolvedKey) {
    return (
      <div className="form-group">
        <label style={labelStyle}>Location on map</label>
        <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: 'var(--public-text-secondary)' }}>
          Map picker is not configured. Paste a Google Maps link for your UAE address if you have one.
        </p>
        <input
          className="form-input"
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://www.google.com/maps?q=..."
        />
      </div>
    )
  }

  return (
    <div className="form-group">
      <label style={labelStyle}>Location on map</label>
      <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: 'var(--public-text-secondary)' }}>
        Search for your address or click the map to drop a pin. Drag the pin to fine-tune.
      </p>
      {loadError ? (
        <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: 'var(--error)' }}>{loadError}</p>
      ) : null}
      <input
        ref={searchRef}
        className="form-input"
        type="text"
        placeholder="Search address in UAE…"
        style={{ marginBottom: '8px' }}
        disabled={!ready && !loadError}
      />
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '240px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 237, 213, 0.35)',
          background: 'rgba(255, 248, 235, 0.5)',
        }}
      />
      <input
        className="form-input"
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Google Maps link"
        style={{ marginTop: '8px', fontSize: '0.8rem' }}
      />
    </div>
  )
}
