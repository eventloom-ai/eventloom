import { appUrl, env, isAiConfigured, isDomainPurchasingConfigured, isOpenSrsConfigured, isStripeConfigured, isSupabaseConfigured, isVercelConfigured, rootDomain, type AiReasoningEffort } from "@/lib/env";
import { verifyOpenSrsRegistrarAccess } from "@/lib/domains/provider";

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
  reasoningEffort: AiReasoningEffort;
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
    sell_domains: isDomainPurchasingConfigured(),
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
  if (!isStripeConfigured()) {
    missing.push("STRIPE_SECRET_KEY");
  }
  if (!isOpenSrsConfigured()) {
    missing.push("OPENSRS_USERNAME", "OPENSRS_API_KEY", "OPENSRS_API_URL", "REGISTRANT_ENCRYPTION_KEY");
  }

  return {
    appUrl: appUrl(),
    rootDomain: rootDomain(),
    capabilities,
    model: env.aiModel(),
    reasoningEffort: env.aiReasoningEffort(),
    ready: capabilities.persist_events && capabilities.generate_with_ai,
    missing: [...new Set(missing)],
  };
}

export async function getVerifiedAgentRuntime(): Promise<AgentRuntime> {
  const runtime = getAgentRuntime();
  if (!runtime.capabilities.sell_domains) return runtime;

  const registrarAuthorized = await verifyOpenSrsRegistrarAccess();
  if (registrarAuthorized) return runtime;

  return {
    ...runtime,
    capabilities: { ...runtime.capabilities, sell_domains: false },
    missing: [...new Set([...runtime.missing, "OPENSRS_API_KEY (unauthorized)"])],
  };
}
