// Service area and map defaults.

/** Generous box around Lebanon; a pin outside it is almost certainly a mistake. */
export const LEBANON_BOUNDS = { minLat: 32.9, maxLat: 34.8, minLng: 34.9, maxLng: 36.8 } as const;

/** Map starts over Beirut until the customer moves the pin. */
export const BEIRUT = { lat: 33.8938, lng: 35.5018 } as const;

export function isInLebanon(lat: number, lng: number) {
  return (
    lat >= LEBANON_BOUNDS.minLat &&
    lat <= LEBANON_BOUNDS.maxLat &&
    lng >= LEBANON_BOUNDS.minLng &&
    lng <= LEBANON_BOUNDS.maxLng
  );
}

/** Turn-by-turn directions in the apps technicians in Lebanon use. */
export function directionsLinks(lat: number, lng: number) {
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
  };
}
