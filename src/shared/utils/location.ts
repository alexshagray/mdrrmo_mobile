import * as Location from 'expo-location';
import { ENV } from '../config/env';

const isPlusCode = (text: string | null | undefined): boolean => {
  if (!text) return false;
  return /^[A-Z0-9]{4,8}\+[A-Z0-9]{2,8}/i.test(text.trim());
};

const cleanFormattedAddress = (addr: string | null | undefined): string => {
  if (!addr) return '';
  return addr.replace(/^[A-Z0-9]{2,8}\+[A-Z0-9]{2,8}(,\s*)?/gi, '').trim();
};

/**
 * Reverse geocodes using Mapbox Places API for high accuracy in Opol / Misamis Oriental
 */
export const reverseGeocodeMapbox = async (
  latitude: number,
  longitude: number
): Promise<string | null> => {
  const token = ENV?.MAPBOX_ACCESS_TOKEN;
  if (!token) return null;

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.features || data.features.length === 0) return null;

    const first = data.features[0];
    let placeName = first?.place_name || '';
    if (!placeName) return null;

    // Remove country suffix ", Philippines"
    placeName = placeName.replace(/,\s*Philippines$/i, '').trim();

    // Find the locality / barangay in the feature hierarchy if available
    const localityFeature = data.features.find((f: any) =>
      f.place_type?.includes('locality') || f.place_type?.includes('neighborhood')
    );

    const bName = localityFeature?.text;
    if (bName && !placeName.toLowerCase().includes(`brgy. ${bName.toLowerCase()}`) && !placeName.toLowerCase().includes(`barangay ${bName.toLowerCase()}`)) {
      if (placeName.includes(bName)) {
        placeName = placeName.replace(bName, `Brgy. ${bName}`);
      } else {
        placeName = placeName.replace(/,\s*Opol/i, `, Brgy. ${bName}, Opol`);
      }
    }

    // Ensure it's not just the bare town name
    if (
      placeName.toLowerCase() === 'opol, misamis oriental' ||
      placeName.toLowerCase() === 'misamis oriental' ||
      placeName.toLowerCase() === 'opol'
    ) {
      if (bName && bName.toLowerCase() !== 'opol') {
        return `Brgy. ${bName}, Opol, Misamis Oriental`;
      }
      return null;
    }

    return placeName;
  } catch (err) {
    return null;
  }
};

/**
 * Converts geographic coordinates into a human-readable real place/address name.
 * Excludes raw coordinates and Plus Codes.
 */
export const resolveAddressFromCoords = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    return 'Opol, Misamis Oriental';
  }

  // 1. Try Mapbox Reverse Geocoding first (accurate roads, POIs and Barangays in Opol)
  try {
    const mapboxResult = await reverseGeocodeMapbox(latitude, longitude);
    if (mapboxResult && mapboxResult.trim().length > 0) {
      return mapboxResult;
    }
  } catch (err) {
    console.log('Mapbox geocoding error:', err);
  }

  try {
    const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (geocode && geocode.length > 0) {
      const g = geocode[0];

      // Clean street (ignore Unnamed Road or Plus codes)
      let street = g.street || '';
      if (street.toLowerCase().includes('unnamed') || isPlusCode(street)) {
        street = '';
      }
      const streetLine = [g.streetNumber, street].filter(Boolean).join(' ');

      // POI or establishment name (exclude Plus Codes or duplicate names)
      const poiName =
        g.name && !isPlusCode(g.name) && g.name !== g.street && g.name !== g.city
          ? g.name
          : '';

      // Barangay / District formatting (standard in Philippines)
      let barangay = g.district || '';
      if (
        barangay &&
        !barangay.toLowerCase().startsWith('brgy') &&
        !barangay.toLowerCase().startsWith('barangay')
      ) {
        barangay = `Brgy. ${barangay}`;
      }

      const city = g.city || 'Opol';
      let province = 'Misamis Oriental';
      if (g.subregion && !g.subregion.toLowerCase().includes('mindanao')) {
        province = g.subregion;
      } else if (g.region && !g.region.toLowerCase().includes('mindanao')) {
        province = g.region;
      }

      const addressComponents = [
        poiName,
        streetLine,
        barangay,
        city,
        province,
      ].filter(Boolean);

      const uniqueComponents = Array.from(new Set(addressComponents));
      if (uniqueComponents.length >= 2) {
        return uniqueComponents.join(', ');
      }

      // Fallback to formattedAddress cleaned of Plus Codes
      if (g.formattedAddress) {
        let cleaned = cleanFormattedAddress(g.formattedAddress);
        cleaned = cleaned.replace(/Northern Mindanao/gi, 'Misamis Oriental').replace(/,\s*Philippines/gi, '').trim();
        if (cleaned) {
          if (barangay && !cleaned.toLowerCase().includes(g.district!.toLowerCase())) {
            return `${barangay}, ${cleaned}`;
          }
          return cleaned;
        }
      }

      if (uniqueComponents.length > 0) {
        return uniqueComponents.join(', ');
      }
    }
  } catch (err) {
    console.log('Reverse geocoding error:', err);
  }

  return 'Opol, Misamis Oriental';
};

export const OPOL_BARANGAYS = [
  'Awang',
  'Bagocboc',
  'Barra',
  'Bonbon',
  'Cauyonan',
  'Igpit',
  'Limonda',
  'Luyongbonbon',
  'Luyongbon',
  'Malanang',
  'Nangcaon',
  'Patag',
  'Poblacion',
  'Taboc',
  'Tingalan',
];

/**
 * Formats Place of Incident for PCRs:
 * If the location contains an electric post code, location code, or raw coordinates,
 * removes the code/coords and returns strictly "Barangay [Barangay], Opol, Misamis Oriental".
 */
export const formatPlaceOfIncident = (
  rawLocation?: string | null,
  fallbackBarangay?: string | null,
  latitude?: number | null,
  longitude?: number | null
): string => {
  const text = (rawLocation || '').trim();

  // Check if text has codes, poles, posts, markers or coordinates
  const hasCodeOrPole = /\b(pole|post|streetlight|marker|code|sl-|mkr-|brg-|jcb|lr\d|ir\d)\b/i.test(text)
    || /#[0-9]+/i.test(text)
    || /\b\d{2,4}-\d{3,6}\b/i.test(text); // e.g. 302-01385
  const hasCoordinates = /\b-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\b/.test(text);
  const isCodeOnly = text.length > 0 && text.length <= 15 && /^[A-Z0-9@#_-]+$/i.test(text);

  let detectedBarangay = (fallbackBarangay || '').trim();

  // Try to find known Opol barangay in text or fallback
  for (const b of OPOL_BARANGAYS) {
    const regex = new RegExp(`\\b${b}\\b`, 'i');
    if (regex.test(text) || (detectedBarangay && regex.test(detectedBarangay))) {
      detectedBarangay = b === 'Luyongbon' ? 'Luyongbonbon' : b;
      break;
    }
  }

  // If it was a code, pole, or coordinates:
  if (hasCodeOrPole || hasCoordinates || isCodeOnly) {
    if (detectedBarangay) {
      return `Barangay ${detectedBarangay}, Opol, Misamis Oriental`;
    }
    return 'Opol, Misamis Oriental';
  }

  // If text is a normal address (e.g. "Zone 2, Barangay Igpit" or "Purok 3"):
  if (text) {
    let clean = text.replace(/Northern Mindanao/gi, 'Misamis Oriental').replace(/,\s*Philippines/gi, '').trim();
    if (detectedBarangay && !clean.toLowerCase().includes(detectedBarangay.toLowerCase())) {
      clean = `Barangay ${detectedBarangay}, ${clean}`;
    }
    if (!clean.toLowerCase().includes('opol')) {
      clean = `${clean}, Opol, Misamis Oriental`;
    } else if (!clean.toLowerCase().includes('misamis oriental')) {
      clean = `${clean}, Misamis Oriental`;
    }
    return clean;
  }

  if (detectedBarangay) {
    return `Barangay ${detectedBarangay}, Opol, Misamis Oriental`;
  }

  return 'Opol, Misamis Oriental';
};
