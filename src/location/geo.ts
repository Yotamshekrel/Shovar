export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in meters. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Grid size for the places cache: 0.1° ≈ 11 km, so a query covers the surrounding city area. */
export const CELL_DEG = 0.1;

export function cellKey(p: LatLng, size = CELL_DEG): string {
  const lat = Math.floor(p.lat / size);
  const lng = Math.floor(p.lng / size);
  return `${lat}:${lng}`;
}

export function cellCenter(key: string, size = CELL_DEG): LatLng {
  const [lat, lng] = key.split(':').map(Number);
  return { lat: (lat + 0.5) * size, lng: (lng + 0.5) * size };
}

/** "150m" / "1.2km" style distance, rounded to what's useful on a notification. */
export function roundDistance(m: number): { value: number; unit: 'm' | 'km' } {
  if (m < 1000) return { value: Math.max(10, Math.round(m / 10) * 10), unit: 'm' };
  return { value: Math.round(m / 100) / 10, unit: 'km' };
}

export function isValidCoordinate(p: Partial<LatLng> | null | undefined): p is LatLng {
  return (
    !!p &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat!) <= 90 &&
    Math.abs(p.lng!) <= 180 &&
    !(p.lat === 0 && p.lng === 0)
  );
}
