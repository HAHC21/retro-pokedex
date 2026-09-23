/** Dev uses relative `/api` paths so the Vite proxy can reach the local API. */
export const API_ORIGIN = import.meta.env.PROD ? "https://api.retropokedex.com" : "";

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_ORIGIN}${normalized}`;
}
