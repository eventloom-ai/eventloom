function read(name: string) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : "";
}

function enabled(name: string, productionDefault = false) {
  const value = read(name).toLowerCase();
  if (value) return value === "1" || value === "true" || value === "yes" || value === "on";
  const production = process.env.NODE_ENV === "production" || read("VERCEL_ENV") === "production";
  return production ? productionDefault : true;
}

export function isProductionDeployment() {
  return read("VERCEL_ENV") === "production";
}

// Production must never take payments on a test key: test cards would publish sites and could buy real domains.
export function stripeKeyMatchesDeployment(key = read("STRIPE_SECRET_KEY")) {
  return !isProductionDeployment() || /^(sk|rk)_live_/.test(key);
}

export function appUrl() {
  return read("NEXT_PUBLIC_APP_URL") || "http://localhost:3000";
}

export function rootDomain() {
  if (read("NEXT_PUBLIC_ROOT_DOMAIN")) return read("NEXT_PUBLIC_ROOT_DOMAIN");
  try { return new URL(appUrl()).host; } catch { return "localhost"; }
}

export function domainPriceCapUsd() {
  const value = Number(read("DOMAIN_INCLUDED_PRICE_CAP_USD") || "15");
  return Number.isFinite(value) && value > 0 ? value : 15;
}

function supabaseUrl() {
  return read("NEXT_PUBLIC_SUPABASE_URL") || read("SUPABASE_URL");
}

function supabasePublicKey() {
  return read("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || read("NEXT_PUBLIC_SUPABASE_ANON_KEY") || read("SUPABASE_PUBLISHABLE_KEY") || read("SUPABASE_ANON_KEY");
}

function supabaseServiceRoleKey() {
  return read("SUPABASE_SERVICE_ROLE_KEY") || read("SUPABASE_SECRET_KEY");
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl() && supabasePublicKey() && supabaseServiceRoleKey());
}

export function isVercelConfigured() {
  return Boolean(read("VERCEL_API_TOKEN") && read("VERCEL_PROJECT_ID"));
}

export function isAiConfigured() {
  return Boolean(read("OPENAI_API_KEY") || (read("AI_GATEWAY_URL") && read("AI_API_KEY")));
}

export function isStripeConfigured() {
  return Boolean(read("STRIPE_SECRET_KEY"));
}

export function isDomainPurchasingConfigured() {
  return publicDomainPurchasingEnabled() && isStripeConfigured() && isSupabaseConfigured() && isVercelConfigured() && isOpenSrsConfigured();
}

export function publicSignupEnabled() {
  return enabled("PUBLIC_SIGNUP_ENABLED");
}

export function publicCheckoutEnabled() {
  return enabled("PUBLIC_CHECKOUT_ENABLED");
}

export function publicRsvpEnabled() {
  return enabled("PUBLIC_RSVP_ENABLED");
}

export function publicDomainPurchasingEnabled() {
  return enabled("DOMAIN_PURCHASING_ENABLED");
}

export function mfaEnforcementEnabled() {
  return enabled("MFA_ENFORCEMENT_ENABLED", true);
}

export function isOpenSrsConfigured() {
  return Boolean(read("OPENSRS_USERNAME") && read("OPENSRS_API_KEY") && read("OPENSRS_API_URL") && registrantEncryptionKey());
}

export function registrantEncryptionKey() { return read("REGISTRANT_ENCRYPTION_KEY"); }

export function isTurnstileConfigured() {
  return Boolean(read("NEXT_PUBLIC_TURNSTILE_SITE_KEY") && read("TURNSTILE_SECRET_KEY"));
}

export function legalIdentityConfigured() {
  return Boolean(read("LEGAL_BUSINESS_NAME") && read("LEGAL_CONTACT_EMAIL") && read("LEGAL_MAILING_ADDRESS"));
}

export function externalLaunchReviewsApproved() {
  return [
    "LEGAL_REVIEW_APPROVED",
    "ACCOUNTING_REVIEW_APPROVED",
    "PENETRATION_TEST_APPROVED",
    "PROVIDER_DPA_REVIEW_APPROVED",
    "PRIVACY_TABLETOP_COMPLETED",
  ].every((name) => enabled(name, false));
}

export function monitoringConfigured() {
  return Boolean(read("SENTRY_DSN") && read("SENTRY_ORG") && read("SENTRY_PROJECT"));
}

export const AI_REASONING_EFFORTS = ["none", "low", "medium", "high", "xhigh", "max"] as const;
export type AiReasoningEffort = (typeof AI_REASONING_EFFORTS)[number];

function aiModel() {
  return read("OPENAI_MODEL") || read("AI_MODEL") || "gpt-5.6-luna";
}

/**
 * Every OpenAI call names its purpose so it gets a reasoning effort sized to the job (see DECISIONS.md,
 * 2026-10-09). Reasoning tokens are the bulk of the bill and of the latency, and a build is one flat credit.
 * - planner: extracts facts and a palette from the brief into a fixed schema.
 * - art-director: picks a style/palette from a closed set and writes a few lines of copy.
 * - original-site: composes a whole page document (studio create, "start over").
 * - studio-edit: applies one requested change to an existing page.
 */
export type AiCallPurpose = "planner" | "art-director" | "original-site" | "studio-edit";

export const DEFAULT_AI_REASONING_EFFORT: Record<AiCallPurpose, AiReasoningEffort> = {
  planner: "low",
  "art-director": "low",
  "original-site": "medium",
  "studio-edit": "medium",
};

function parseEffort(value: string): AiReasoningEffort | null {
  const normalized = value.toLowerCase();
  return (AI_REASONING_EFFORTS as readonly string[]).includes(normalized) ? (normalized as AiReasoningEffort) : null;
}

/**
 * Precedence: OPENAI_REASONING_EFFORT_<PURPOSE> (e.g. OPENAI_REASONING_EFFORT_STUDIO_EDIT), then the global
 * OPENAI_REASONING_EFFORT / AI_REASONING_EFFORT (forces every call), then the per-purpose default.
 * Invalid values are ignored.
 */
function aiReasoningEffort(purpose: AiCallPurpose = "studio-edit"): AiReasoningEffort {
  const perPurpose = read(`OPENAI_REASONING_EFFORT_${purpose.toUpperCase().replace(/-/g, "_")}`);
  return parseEffort(perPurpose)
    ?? parseEffort(read("OPENAI_REASONING_EFFORT") || read("AI_REASONING_EFFORT"))
    ?? DEFAULT_AI_REASONING_EFFORT[purpose];
}

// Per-call cap for one provider request. AI routes run with maxDuration 300s, so calls in one request
// also share a total budget (aiDeadline/aiCallTimeoutMs in lib/ai/deadline) that is cut down as time passes.
export const AI_REQUEST_TIMEOUT_MS = 240_000;

export function openaiResponsesOptions(purpose: AiCallPurpose) {
  return {
    model: aiModel(),
    reasoning: { effort: aiReasoningEffort(purpose) },
  };
}

export const env = {
  appUrl,
  rootDomain,
  domainPriceCapUsd,
  supabaseUrl,
  supabaseAnonKey: supabasePublicKey,
  supabasePublicKey,
  supabaseServiceRoleKey,
  stripeSecretKey: () => read("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => read("STRIPE_WEBHOOK_SECRET"),
  vercelApiToken: () => read("VERCEL_API_TOKEN"),
  vercelProjectId: () => read("VERCEL_PROJECT_ID"),
  vercelTeamId: () => read("VERCEL_TEAM_ID"),
  openSrsUsername: () => read("OPENSRS_USERNAME"),
  openSrsApiKey: () => read("OPENSRS_API_KEY"),
  openSrsApiUrl: () => read("OPENSRS_API_URL"),
  registrantEncryptionKey,
  rsvpTokenSecret: () => read("RSVP_TOKEN_SECRET"),
  ipHashSecret: () => read("IP_HASH_SECRET"),
  turnstileSecretKey: () => read("TURNSTILE_SECRET_KEY"),
  turnstileSiteKey: () => read("NEXT_PUBLIC_TURNSTILE_SITE_KEY"),
  readinessToken: () => read("READINESS_TOKEN"),
  cronSecret: () => read("CRON_SECRET"),
  legalBusinessName: () => read("LEGAL_BUSINESS_NAME") || "Eventloom",
  legalContactEmail: () => read("LEGAL_CONTACT_EMAIL") || "privacy@eventloom.invalid",
  legalMailingAddress: () => read("LEGAL_MAILING_ADDRESS"),
  aiGatewayUrl: () => read("AI_GATEWAY_URL"),
  aiApiKey: () => read("AI_API_KEY"),
  openaiApiKey: () => read("OPENAI_API_KEY"),
  aiModel,
  aiReasoningEffort,
};
