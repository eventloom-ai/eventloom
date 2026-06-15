import { appUrl, env, isAiConfigured, isStripeConfigured, isSupabaseConfigured, isVercelConfigured, rootDomain } from "@/lib/env";

export type AgentCapability =
  | "persist_events"
  | "store_artifacts"
  | "collect_rsvps"
  | "generate_with_ai"
  | "attach_vercel_domains"
  | "sell_domains";

export type AgentRuntime = {
  appUrl: string;
  rootDomain: string;
  capabilities: Record<AgentCapability, boolean>;
  model: string;
  ready: boolean;
  missing: string[];
};

export function getAgentRuntime(): AgentRuntime {
  const capabilities: Record<AgentCapability, boolean> = {
    persist_events: isSupabaseConfigured(),
    store_artifacts: isSupabaseConfigured(),
    collect_rsvps: isSupabaseConfigured(),
    generate_with_ai: isAiConfigured(),
    attach_vercel_domains: isVercelConfigured(),
    sell_domains: isStripeConfigured(),
  };

  const missing: string[] = [];
  if (!capabilities.persist_events) {
    missing.push("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!capabilities.generate_with_ai) {
    missing.push("OPENAI_API_KEY or AI_GATEWAY_URL + AI_API_KEY");
  }
  if (!capabilities.attach_vercel_domains) {
    missing.push("VERCEL_API_TOKEN", "VERCEL_PROJECT_ID");
  }

  return {
    appUrl: appUrl(),
    rootDomain: rootDomain(),
    capabilities,
    model: env.aiModel(),
    ready: capabilities.persist_events && capabilities.generate_with_ai,
    missing,
  };
}
