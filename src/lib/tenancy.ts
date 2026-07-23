import { headers } from "next/headers";
import { rootDomain } from "@/lib/env";
import { demoEvent, demoEvents } from "@/lib/sample-data";
import { serviceSupabase } from "@/lib/supabase/server";
import type { EventConfig, EventRecord, EventStatus, PageArtifact } from "@/lib/types";
import { siteDocumentSchema } from "@/lib/site-document";

const INTERNAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const PLATFORM_HOST_SUFFIXES = [".vercel.app"];

export function normalizeHost(rawHost: string) {
  return rawHost.split(":")[0]?.toLowerCase() ?? "";
}

export function slugFromHost(host: string, root = rootDomain()) {
  const normalized = normalizeHost(host);
  if (!normalized || INTERNAL_HOSTS.has(normalized)) {
    return null;
  }

  if (PLATFORM_HOST_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) {
    return null;
  }

  const rootHost = normalizeHost(root);
  if (normalized === rootHost) {
    return null;
  }

  if (normalized.endsWith(`.${rootHost}`)) {
    const subdomain = normalized.slice(0, -(rootHost.length + 1));
    return subdomain && !subdomain.includes(".") ? subdomain : null;
  }

  return normalized;
}

export async function currentHost() {
  const headerList = await headers();
  return normalizeHost(headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "");
}

type EventRow = {
  id: string;
  owner_id?: string | null;
  slug: string;
  status: EventStatus;
  rsvp_open: boolean;
  config: EventConfig;
  draft_version_id?: string | null;
  published_version_id?: string | null;
};

export async function resolveEventBySlug(slug: string): Promise<EventRecord | null> {
  if (slug === demoEvent.slug) {
    return { ...demoEvent, rsvp_open: false };
  }

  const client = serviceSupabase();
  if (!client) {
    return demoEvents.find((event) => event.slug === slug) ?? (slug === demoEvent.slug ? demoEvent : null);
  }

  const { data: event, error } = await client
    .from("events")
    .select("id, owner_id, slug, status, rsvp_open, config, draft_version_id, published_version_id")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !event) {
    return null;
  }

  const row = event as EventRow;
  if (row.status !== "published") return null;
  if (row.status === "published") {
    const { data: entitlement } = await client
      .from("event_entitlements")
      .select("status, expires_at")
      .eq("event_id", row.id)
      .maybeSingle();
    if (entitlement?.status !== "active" || !entitlement.expires_at || new Date(entitlement.expires_at) <= new Date()) {
      return null;
    }
  }

  if (row.published_version_id) {
    const { data: version } = await client
      .from("event_versions")
      .select("id, config, document")
      .eq("id", row.published_version_id)
      .eq("event_id", row.id)
      .maybeSingle();
    const document = siteDocumentSchema.safeParse(version?.document);
    if (version && document.success) {
      return {
        id: row.id,
        owner_id: row.owner_id,
        slug: row.slug,
        status: row.status,
        rsvp_open: row.rsvp_open,
        config: version.config as EventConfig,
        document: document.data,
        draft_version_id: row.draft_version_id,
        published_version_id: row.published_version_id,
        artifact: null,
      };
    }
  }

  const { data: artifact } = await client
    .from("page_artifacts")
    .select("html, css, generated_at, model")
    .eq("event_id", row.id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    id: row.id,
    owner_id: row.owner_id,
    slug: row.slug,
    status: row.status,
    rsvp_open: row.rsvp_open,
    config: row.config,
    draft_version_id: row.draft_version_id,
    published_version_id: row.published_version_id,
    artifact: artifact
      ? ({
          html: artifact.html,
          css: artifact.css,
          generatedAt: artifact.generated_at,
          model: artifact.model,
        } satisfies PageArtifact)
      : null,
  };
}

export async function resolveEventByHost(host: string): Promise<EventRecord | null> {
  const hostTenant = slugFromHost(host);
  if (!hostTenant) {
    return null;
  }

  const client = serviceSupabase();
  if (!client) {
    return demoEvent;
  }

  const { data: domain } = await client
    .from("domains")
    .select("event_id, domain")
    .eq("domain", hostTenant)
    .maybeSingle();

  if (domain?.event_id) {
    const { data: event } = await client.from("events").select("slug").eq("id", domain.event_id).maybeSingle();
    return event?.slug ? resolveEventBySlug(event.slug) : null;
  }

  return resolveEventBySlug(hostTenant);
}
