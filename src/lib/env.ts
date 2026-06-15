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
  return Boolean(
    read("NEXT_PUBLIC_SUPABASE_URL") &&
      read("NEXT_PUBLIC_SUPABASE_ANON_KEY") &&
      read("SUPABASE_SERVICE_ROLE_KEY"),
  );
}

export const env = {
  appUrl,
  rootDomain,
  domainPriceCapUsd,
  supabaseUrl: () => read("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => read("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
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
