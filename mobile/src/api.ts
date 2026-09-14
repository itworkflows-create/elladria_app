import { Platform } from "react-native";
import type { Catalog } from "./catalog";
export function apiBase() {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (Platform.OS === "web" && typeof window !== "undefined")
    return `${window.location.protocol}//${window.location.hostname}:8093`;
  return "";
}
export async function loadCatalog(signal?: AbortSignal): Promise<Catalog> {
  const base = apiBase();
  if (!base) throw new Error("No catalog server configured.");
  const response = await fetch(`${base}/api/catalog`, { signal });
  if (!response.ok) throw new Error("Catalog server unavailable.");
  const catalog = await response.json();
  if (
    !catalog ||
    !Array.isArray(catalog.jobs) ||
    !catalog.content ||
    !Number.isInteger(catalog.revision)
  )
    throw new Error("Invalid catalog response.");
  return catalog;
}
