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

export function referralGrowthEnabled() {
  const requested = enabled("REFERRAL_GROWTH_ENABLED", false);
  const production = process.env.NODE_ENV === "production" || read("VERCEL_ENV") === "production";
  return requested && (!production || enabled("LEGAL_REVIEW_APPROVED", false));
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
  referralTokenSecret: () => read("REFERRAL_TOKEN_SECRET"),
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
  aiModel: () => read("OPENAI_MODEL") || read("AI_MODEL") || "gpt-5.5",
};
