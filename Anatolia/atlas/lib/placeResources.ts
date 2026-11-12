/** Lazy place resources. The shard is fetched when a panel opens. */

export interface PlaceResource {
  id: string;
  names?: string[];
  references?: { citation: string; url?: string | null }[];
  pleiadesUrl?: string;
  wikipedia?: { lang: string; url: string }[];
  commons?: string;
  heritage?: { label: string; url?: string }[];
  directors?: { name: string; url?: string | null }[];
  website?: string | null;
}

/** Same shard key as the build script. */
export function resourceBucket(placeId: string): string {
  if (placeId.startsWith("Q") && placeId.length >= 3 && placeId.charCodeAt(1) >= 48 && placeId.charCodeAt(1) <= 57) {
    return placeId.slice(0, 3);
  }
  if (placeId.charCodeAt(0) >= 48 && placeId.charCodeAt(0) <= 57) {
    return placeId.length >= 3 ? placeId.slice(0, 3) : placeId;
  }
  return placeId.slice(0, 2) || placeId;
}

const PLACE_ID = /^(?:Q\d+|\d+|[a-z0-9]+(?:-[a-z0-9]+)*)$/;

export function resourceUrl(placeId: string): string | null {
  if (!PLACE_ID.test(placeId)) return null;
  return `/resources/${resourceBucket(placeId)}.json`;
}

/** Site-scale OpenStreetMap view. Built from the pin already on the map. */
export function osmHref(longitude: number, latitude: number): string {
  return `https://www.openstreetmap.org/#map=15/${latitude.toFixed(5)}/${longitude.toFixed(5)}`;
}

/** Same-origin close-up route. Not an external image. */
export function closeupHref(placeId: string): string | null {
  if (/^Q\d+$/.test(placeId) || /^\d+$/.test(placeId) || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(placeId)) {
    return `/api/closeup?id=${encodeURIComponent(placeId)}&part=hillshade`;
  }
  return null;
}
