export type EventStatus = "draft" | "published" | "archived";
export type DomainStatus = "searching" | "quoted" | "registered" | "vercel_pending" | "ready" | "failed";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type EventTheme = {
  mood: string;
  colors: string[];
  fontPairing: string;
};

export type EventSiteTemplate = "custom";

export type EventScheduleItem = {
  title: string;
  time: string;
  location?: string;
  description?: string;
};

export type RsvpField = "name" | "attendance" | "party_size" | "guest_names" | "email" | "phone" | "meal_preference" | "note";

export type EventConfig = {
  title: string;
  subtitle: string;
  eventType: string;
  date: string;
  venueName: string;
  venueAddress?: string;
  schedule: EventScheduleItem[];
  rsvpFields: RsvpField[];
  theme: EventTheme;
  template?: EventSiteTemplate;
  hallInfo?: string;
  directionsLabel?: string;
  rsvpDeadline?: string;
  heroImageUrl?: string;
  galleryImageUrls?: string[];
};

export type PageArtifact = {
  html: string;
  css: string;
  generatedAt: string;
  model: string;
};

export type EventRecord = {
  id: string;
  owner_id?: string | null;
  slug: string;
  status: EventStatus;
  rsvp_open: boolean;
  config: EventConfig;
  artifact?: PageArtifact | null;
  document?: SiteDocument | null;
  draft_version_id?: string | null;
  published_version_id?: string | null;
};

export type SiteRevision = {
  id: string;
  event_id: string;
  parent_version_id: string | null;
  source: "initial" | "ai" | "manual" | "restore" | "legacy";
  summary: string;
  prompt: string;
  config: EventConfig;
  document: SiteDocument;
  created_at: string;
};

export type BuilderMessage = {
  id: string;
  event_id: string;
  run_id: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  selected_node_ids: string[];
  version_id: string | null;
  status: "pending" | "complete" | "failed" | "cancelled";
  created_at: string;
};

export type BuilderRunEvent = {
  sequence: number;
  type: "status" | "patch" | "message" | "committed" | "error" | "cancelled";
  payload: Record<string, unknown>;
  created_at: string;
};

export type DomainQuote = {
  domain: string;
  available: boolean;
  premium: boolean;
  currency: string;
  registrationCost: number;
  renewalCost: number;
};
import type { SiteDocument } from "@/lib/site-document";
