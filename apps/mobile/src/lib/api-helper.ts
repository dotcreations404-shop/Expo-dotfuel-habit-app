import { Platform } from 'react-native';

/**
 * Resolves the API endpoint URL.
 * Native environments require absolute URLs, while Web can use relative paths.
 */
export function getApiUrl(path: string): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location.hostname !== 'app.dotfuel.shop') {
      return `https://app.dotfuel.shop${path}`;
    }
    return path;
  }
  // Fallback to the production domain where Vercel hosts the +api routes
  return `https://app.dotfuel.shop${path}`;
}
