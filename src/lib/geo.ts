// Haversine formula - distance between two lat/lng points in miles
export function getDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// NC Triangle area zip code prefixes (Raleigh, Durham, Chapel Hill, Cary)
export const TRIANGLE_ZIP_PREFIXES = ["275", "276", "277"];

export function isTriangleZip(zip: string): boolean {
  return TRIANGLE_ZIP_PREFIXES.some((prefix) => zip.startsWith(prefix));
}

// Estimate drive time (rough: 2 min per mile in suburban area)
export function estimateDriveMinutes(distanceMiles: number): number {
  return Math.max(1, Math.round(distanceMiles * 2));
}

// Get user's current position
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    });
  });
}
