import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { env, isSupabaseConfigured } from "@/lib/env";
import { isReservedSlug } from "@/lib/reserved-slugs";

/**
 * Proxy fast path for suspended events: answers 410 Gone with a neutral "This page is unavailable" before the event
 * page renders, on every host (eventloom.co/<slug>, <slug>.eventloom.co, custom domains, and their share images).
 *
 * The page itself is the authoritative check (resolveEventBySlug returns nothing for a suspended event, so it 404s
 * with no metadata or share card). This gate only adds the right status code, so it fails OPEN: a lookup error or
 * timeout lets the request through to that check. Results are cached briefly per server instance.
 */

const LOOKUP_TIMEOUT_MS = 1_500;
const CACHE_TTL_MS = 30_000;
const CACHE_MAX_ENTRIES = 2_000;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LIVE_DOMAIN_STATUSES = ["vercel_pending", "ready"];

export type SuspensionTarget = { kind: "slug"; value: string } | { kind: "domain"; value: string };

const cache = new Map<string, { suspended: boolean; expiresAt: number }>();
let client: SupabaseClient | null = null;

function lookupClient() {
  if (!isSupabaseConfigured()) return null;
  client ??= createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

function targetForTenant(tenant: string): SuspensionTarget | null {
  if (tenant.includes(".")) return { kind: "domain", value: tenant };
  return SLUG.test(tenant) && !isReservedSlug(tenant) ? { kind: "slug", value: tenant } : null;
}

/**
 * Which event a request is for, if any: the host tenant on subdomains and custom domains; on the app host, the first
 * path segment of /<slug> and /<slug>/opengraph-image…, or the host of /sites/<host>…. Reserved names never match.
 */
export function suspensionTarget(hostTenant: string | null, pathname: string): SuspensionTarget | null {
  if (hostTenant) return targetForTenant(hostTenant);
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "sites" && segments[1]) {
    let host = "";
    try {
      host = decodeURIComponent(segments[1]).toLowerCase().split(":")[0] ?? "";
    } catch {
      return null;
    }
    return host ? targetForTenant(host) : null;
  }
  if (segments.length === 1 || (segments.length >= 2 && segments[1] === "opengraph-image")) {
    const slug = segments[0]?.toLowerCase() ?? "";
    return SLUG.test(slug) && !isReservedSlug(slug) ? { kind: "slug", value: slug } : null;
  }
  return null;
}

async function lookupSuspended(target: SuspensionTarget): Promise<boolean | null> {
  const db = lookupClient();
  if (!db) return false;
  const signal = () => AbortSignal.timeout(LOOKUP_TIMEOUT_MS);
  let eventFilter: { column: "slug" | "id"; value: string };
  if (target.kind === "domain") {
    const { data, error } = await db
      .from("domains")
      .select("event_id")
      .eq("domain", target.value)
      .not("order_id", "is", null)
      .in("status", LIVE_DOMAIN_STATUSES)
      .abortSignal(signal())
      .maybeSingle();
    if (error) return null;
    if (!data?.event_id) return false;
    eventFilter = { column: "id", value: data.event_id as string };
  } else {
    eventFilter = { column: "slug", value: target.value };
  }
  const { data, error } = await db.from("events").select("suspended_at").eq(eventFilter.column, eventFilter.value).abortSignal(signal()).maybeSingle();
  if (error) return null;
  return Boolean((data as { suspended_at?: string | null } | null)?.suspended_at);
}

export async function isSuspendedTarget(target: SuspensionTarget, now = Date.now()): Promise<boolean> {
  const key = `${target.kind}:${target.value}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.suspended;
  const suspended = await lookupSuspended(target).catch(() => null);
  if (suspended === null) return false;
  if (cache.size >= CACHE_MAX_ENTRIES) cache.clear();
  cache.set(key, { suspended, expiresAt: now + CACHE_TTL_MS });
  return suspended;
}

export function clearSuspensionCache() {
  cache.clear();
}

const UNAVAILABLE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Page unavailable</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#fbfbfd;color:#1d1d1f;font-family:system-ui,-apple-system,sans-serif"><main style="max-width:28rem;padding:2rem;text-align:center"><h1 style="font-size:1.6rem;font-weight:600;margin:0">This page is unavailable</h1><p style="margin-top:0.75rem;line-height:1.6;color:#6e6e73">The page you’re looking for can’t be shown.</p></main></body></html>`;

/** Neutral: says nothing about the event, its host, or why it is down. */
export function unavailableResponse() {
  return new NextResponse(UNAVAILABLE_HTML, {
    status: 410,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "private, no-store" },
  });
}

/** For the proxy: a 410 response for a suspended event's page, or null to continue as usual. */
export async function suspendedEventResponse(hostTenant: string | null, pathname: string): Promise<NextResponse | null> {
  const target = suspensionTarget(hostTenant, pathname);
  if (!target) return null;
  return (await isSuspendedTarget(target)) ? unavailableResponse() : null;
}
