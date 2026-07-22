import { domainProvider } from "@/lib/domains/provider";
import { addDomainToVercelProject } from "@/lib/domains/vercel";
import { domainPriceCapUsd } from "@/lib/env";
import { evaluateDomainQuote } from "@/lib/validation";
import type { DomainRegistrant } from "@/lib/domains/registrant";

export type ProvisionedDomain = {
  domain: string;
  providerId: string;
  registrationCost: number;
  renewalCost: number;
};

export async function provisionPurchasedDomain(domain: string, registrant?: DomainRegistrant): Promise<
  { ok: true; provisioned: ProvisionedDomain } | { ok: false; error: string }
> {
  const provider = domainProvider();
  const quotes = await provider.check([domain]).catch(() => null);
  const quote = quotes?.find((item) => item.domain === domain);
  if (!quote) return { ok: false, error: "domain_check_failed" };

  const evaluation = evaluateDomainQuote(quote, domainPriceCapUsd());
  if (!evaluation.ok) return { ok: false, error: `domain_${evaluation.reason}` };

  const registration = await provider.register(domain, registrant);
  if (!registration.ok) return registration;

  const vercel = await addDomainToVercelProject(domain);
  if (!vercel.ok) return vercel;

  const dns = await provider.ensureVercelDns(domain, vercel.ipv4);
  if (!dns.ok) return dns;

  return {
    ok: true,
    provisioned: {
      domain,
      providerId: registration.providerId,
      registrationCost: quote.registrationCost,
      renewalCost: quote.renewalCost,
    },
  };
}
