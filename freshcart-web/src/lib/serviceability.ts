import { DELIVERY_ZONE_CENTER, DELIVERY_ZONE_RADIUS_KM } from '@freshcart/types';

// OpenStreetMap Nominatim — free, no API key, matches the "MVP" tier called for here.
// Its usage policy asks for a descriptive User-Agent, which browser fetch() can't set
// (it's a forbidden header); the Referer header sent automatically is the closest this
// client-side call can offer. A production deployment expecting real volume should
// proxy this through the backend (rate-limit + proper UA) or move to a paid geocoder.
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export interface GeocodedAddress {
  lat: number;
  lng: number;
  line1: string;
  city: string;
  state: string;
  pincode: string;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinDeliveryZone(lat: number, lng: number): boolean {
  const distanceKm = haversineKm(DELIVERY_ZONE_CENTER.lat, DELIVERY_ZONE_CENTER.lng, lat, lng);
  return distanceKm <= DELIVERY_ZONE_RADIUS_KM;
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        reject(new Error('Location permission denied. Enable it in your browser settings and try again.'));
      } else {
        reject(new Error('Could not determine your location. Please enter your address manually.'));
      }
    }, { enableHighAccuracy: true, timeout: 10000 });
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedAddress | null> {
  const res = await fetch(`${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const addr = data.address || {};
  return {
    lat,
    lng,
    line1: [addr.house_number, addr.road || addr.pedestrian || addr.neighbourhood].filter(Boolean).join(' ') || data.display_name || '',
    city: addr.city || addr.town || addr.village || addr.county || '',
    state: addr.state || '',
    pincode: addr.postcode || '',
  };
}

// Used to approximate coordinates for a manually-typed address (no GPS lat/lng
// available yet) so the serviceability check can still run before save.
export async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!query.trim()) return null;
  const res = await fetch(`${NOMINATIM_BASE}/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const results = await res.json();
  if (!Array.isArray(results) || results.length === 0) return null;
  return { lat: Number(results[0].lat), lng: Number(results[0].lon) };
}
