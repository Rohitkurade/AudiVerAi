import { environment } from '../../../environments/environment';

export const API_BASE_URL = environment.apiBaseUrl.replace(/\/+$/, '');

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export function isAuthApiRequest(url: string): boolean {
  const apiPrefix = apiUrl('/api/');
  return url.startsWith(apiPrefix) || (!API_BASE_URL && url.startsWith('/api/'));
}
