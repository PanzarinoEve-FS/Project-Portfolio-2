// Great-circle distance between two points, in metres.
// Used to tell a business that a documented restroom is close by
export function distanceInMetres(a, b) {
  const EARTH_RADIUS_M = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// Closest restroom to a place, but only if it is within `maxMetres`.
export function findNearestRestroom(place, restrooms, maxMetres = 150) {
  let best = null;

  for (const restroom of restrooms) {
    const metres = distanceInMetres(place, restroom);
    if (metres <= maxMetres && (!best || metres < best.metres)) {
      best = { ...restroom, metres: Math.round(metres) };
    }
  }

  return best;
}

export const KM_PER_MILE = 1.609344;

// Range controls let the user pick units, but the API always takes km.
export const toKm = (value, unit) => (unit === 'mi' ? value * KM_PER_MILE : value);
export const fromKm = (km, unit) => (unit === 'mi' ? km / KM_PER_MILE : km);

// Short distances read better in metres/feet than in km/miles.
export function formatDistance(metres, unit = 'km') {
  if (unit === 'mi') {
    const feet = metres * 3.28084;
    return feet < 1000 ? `${Math.round(feet)}ft` : `${(feet / 5280).toFixed(2)}mi`;
  }

  return metres < 1000 ? `${Math.round(metres)}m` : `${(metres / 1000).toFixed(2)}km`;
}
