import { domainProvider } from "@/lib/domains/provider";
import { addDomainToVercelProject } from "@/lib/domains/vercel";
import { domainPriceCapUsd } from "@/lib/env";
import { logPaymentEvent } from "@/lib/payments/monitoring";
import type { DomainRegistrant } from "@/lib/domains/registrant";
import type { serviceSupabase } from "@/lib/supabase/server";
import type { DomainQuote } from "@/lib/types";

export type ProvisionedDomain = {
  domain: string;
  providerId: string;
  registrationCost: number;
  renewalCost: number;
};

/** Progress of one paid domain, persisted so a retried webhook resumes instead of re-buying. */
export type DomainProvisioningStore = {
  /** The registration already completed for this order, or null when none is recorded. Throws when the state cannot be read. */
  loadRegistration(): Promise<ProvisionedDomain | null>;
  recordRegistration(registration: ProvisionedDomain): Promise<boolean>;
};

type StorageClient = NonNullable<ReturnType<typeof serviceSupabase>>;

// Reads and writes the domains row that claim_domain_fulfillment created for this order.
export function domainProvisioningStore(client: StorageClient, orderId: string, domain: string): DomainProvisioningStore {
  return {
    async loadRegistration() {
      const { data, error } = await client
        .from("domains")
        .select("provider_id, registration_cost_usd, renewal_cost_usd")
        .eq("domain", domain)
        .eq("order_id", orderId)
        .maybeSingle();
      if (error) throw new Error("domain_state_unavailable");
      if (!data?.provider_id) return null;
      const registrationCost = data.registration_cost_usd === null ? Number.NaN : Number(data.registration_cost_usd);
      const renewalCost = data.renewal_cost_usd === null ? Number.NaN : Number(data.renewal_cost_usd);
      // A provider id without its costs cannot be fulfilled and must not be re-registered: stop for manual review.
      if (!Number.isFinite(registrationCost) || !Number.isFinite(renewalCost)) throw new Error("domain_state_incomplete");
      return { domain, providerId: String(data.provider_id), registrationCost, renewalCost };
    },
    async recordRegistration(registration) {
      const { error } = await client
        .from("domains")
        .update({
          status: "registered",
          provider_id: registration.providerId,
          registration_cost_usd: registration.registrationCost,
          renewal_cost_usd: registration.renewalCost,
          failure_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("domain", domain)
        .eq("order_id", orderId);
      return !error;
    },
  };
}

// Provisioning runs after Stripe has taken payment, and checkout already held the quote to the price cap.
// Re-applying the cap here would strand a paid order forever whenever the registrar's price drifts, so only
// refuse what cannot or must not be bought; a price far beyond the cap is held for review as an anomaly.
const PAID_DOMAIN_PRICE_ANOMALY_MULTIPLIER = 2;

export function evaluatePaidDomainQuote(quote: DomainQuote, capUsd: number) {
  if (!quote.available) return { ok: false as const, reason: "unavailable" };
  if (quote.premium) return { ok: false as const, reason: "premium" };
  if (quote.currency !== "USD") return { ok: false as const, reason: "unsupported_currency" };
  if (quote.registrationCost > capUsd * PAID_DOMAIN_PRICE_ANOMALY_MULTIPLIER) return { ok: false as const, reason: "price_anomaly" };
  return { ok: true as const };
}

export async function provisionPurchasedDomain(domain: string, registrant?: DomainRegistrant, store?: DomainProvisioningStore): Promise<
  { ok: true; provisioned: ProvisionedDomain } | { ok: false; error: string }
> {
  const provider = domainProvider();

  // A retry after a later step failed must not check availability again (the domain is ours now, so it reads as taken) or buy it twice.
  let registered: ProvisionedDomain | null;
  try {
    registered = store ? await store.loadRegistration() : null;
  } catch (error) {
    return { ok: false, error: error instanceof Error && error.message.startsWith("domain_state_") ? error.message : "domain_state_unavailable" };
  }

  if (!registered) {
    const quotes = await provider.check([domain]).catch(() => null);
    const quote = quotes?.find((item) => item.domain === domain);
    if (!quote) return { ok: false, error: "domain_check_failed" };

    const evaluation = evaluatePaidDomainQuote(quote, domainPriceCapUsd());
    if (!evaluation.ok) return { ok: false, error: `domain_${evaluation.reason}` };

    const registration = await provider.register(domain, registrant);
    if (!registration.ok) return registration;

    registered = { domain, providerId: registration.providerId, registrationCost: quote.registrationCost, renewalCost: quote.renewalCost };
    if (store && !(await store.recordRegistration(registered).catch(() => false))) {
      // The domain is bought; finishing the remaining steps now is the only way this attempt still succeeds without a record.
      logPaymentEvent("error", "domain_registration_record_failed", { domain, providerId: registered.providerId });
    }
  }

  const vercel = await addDomainToVercelProject(domain);
  if (!vercel.ok) return vercel;

  const dns = await provider.ensureVercelDns(domain, vercel.ipv4);
  if (!dns.ok) return dns;

  return { ok: true, provisioned: registered };
}
