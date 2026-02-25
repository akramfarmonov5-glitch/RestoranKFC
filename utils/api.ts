/// <reference types="vite/client" />

const rawApiBase = (import.meta.env.VITE_API_BASE_URL ?? "").trim();

// Keep trailing slash normalized so `/api/...` composition is stable.
const normalizedApiBase = rawApiBase.replace(/\/+$/, "");

export function apiUrl(path: string): string {
  const value = path.trim();
  if (!value) return value;

  if (/^https?:\/\//i.test(value)) return value;
  if (!normalizedApiBase) return value;

  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return `${normalizedApiBase}${normalizedPath}`;
}
