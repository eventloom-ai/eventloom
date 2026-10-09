import { cache } from "react";
import { resolveEventByHost, resolveEventBySlug } from "@/lib/tenancy";

/**
 * Per-request memoized lookups for guest pages. The page, its metadata and its Open Graph image metadata all ask
 * for the same event while rendering one request, so they share a single lookup.
 */
export const loadEventBySlug = cache(resolveEventBySlug);
export const loadEventByHost = cache(resolveEventByHost);
