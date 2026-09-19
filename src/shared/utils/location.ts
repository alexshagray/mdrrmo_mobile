import * as Location from 'expo-location';

const isPlusCode = (text: string | null | undefined): boolean => {
  if (!text) return false;
  return /^[A-Z0-9]{4,8}\+[A-Z0-9]{2,8}/i.test(text.trim());
};

const cleanFormattedAddress = (addr: string | null | undefined): string => {
  if (!addr) return '';
  return addr.replace(/^[A-Z0-9]{2,8}\+[A-Z0-9]{2,8}(,\s*)?/gi, '').trim();
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

      const city = g.city || g.subregion || 'Opol';
      const province = g.region || 'Misamis Oriental';

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
        const cleaned = cleanFormattedAddress(g.formattedAddress);
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
