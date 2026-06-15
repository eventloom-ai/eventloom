function read(name: string) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : "";
}

export function appUrl() {
  return read("NEXT_PUBLIC_APP_URL") || "http://localhost:3000";
}

export function rootDomain() {
  return read("NEXT_PUBLIC_ROOT_DOMAIN") || "eventloom.ai";
}

export function domainPriceCapUsd() {
  const value = Number(read("DOMAIN_INCLUDED_PRICE_CAP_USD") || "15");
  return Number.isFinite(value) && value > 0 ? value : 15;
}

export function isSupabaseConfigured() {
  return Boolean(read("NEXT_PUBLIC_SUPABASE_URL") && supabasePublicKey() && read("SUPABASE_SERVICE_ROLE_KEY"));
}

function supabasePublicKey() {
  return read("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || read("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function isVercelConfigured() {
  return Boolean(read("VERCEL_API_TOKEN") && read("VERCEL_PROJECT_ID"));
}

export function isAiConfigured() {
  return Boolean(read("OPENAI_API_KEY") || (read("AI_GATEWAY_URL") && read("AI_API_KEY")));
}

export function isStripeConfigured() {
  return Boolean(read("STRIPE_SECRET_KEY") && read("STRIPE_PRICE_ID"));
}

export const env = {
  appUrl,
  rootDomain,
  domainPriceCapUsd,
  supabaseUrl: () => read("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: supabasePublicKey,
  supabasePublicKey,
  supabaseServiceRoleKey: () => read("SUPABASE_SERVICE_ROLE_KEY"),
  stripeSecretKey: () => read("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => read("STRIPE_WEBHOOK_SECRET"),
  stripePriceId: () => read("STRIPE_PRICE_ID"),
  vercelApiToken: () => read("VERCEL_API_TOKEN"),
  vercelProjectId: () => read("VERCEL_PROJECT_ID"),
  vercelTeamId: () => read("VERCEL_TEAM_ID"),
  cloudflareAccountId: () => read("CLOUDFLARE_ACCOUNT_ID"),
  cloudflareRegistrarToken: () => read("CLOUDFLARE_REGISTRAR_TOKEN"),
  aiGatewayUrl: () => read("AI_GATEWAY_URL"),
  aiApiKey: () => read("AI_API_KEY"),
  openaiApiKey: () => read("OPENAI_API_KEY"),
  aiModel: () => read("OPENAI_MODEL") || read("AI_MODEL") || "gpt-5.5",
};
