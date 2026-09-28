import ENV from '../config/env';

/**
 * Normalizes photo / image URLs from Laravel backend.
 * Replaces localhost / 127.0.0.1 with the configured API_URL host to avoid network errors on mobile devices and emulators.
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;

  try {
    const apiOrigin = ENV.API_URL.replace(/\/api\/?$/, '');

    // If it's a relative storage path (e.g. /storage/... or storage/...)
    if (url.startsWith('/storage/')) {
      return `${apiOrigin}${url}`;
    }
    if (url.startsWith('storage/')) {
      return `${apiOrigin}/${url}`;
    }

    // If url contains localhost or 127.0.0.1, replace the origin
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, apiOrigin);
    }
  } catch (e) {
    // Fallback if parsing fails
  }

  return url;
}
