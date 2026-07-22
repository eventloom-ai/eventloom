import { isOpenSrsConfigured } from "@/lib/env";
import type { DomainQuote } from "@/lib/types";
import type { DomainRegistrant } from "@/lib/domains/registrant";
import { OpenSrsDomainProvider } from "@/lib/domains/opensrs";

export type DomainRegistrationResult =
  | { ok: true; providerId: string }
  | { ok: false; error: string };

export type DomainProvider = {
  search(query: string): Promise<DomainQuote[]>;
  check(domains: string[]): Promise<DomainQuote[]>;
  register(domain: string, registrant?: DomainRegistrant): Promise<DomainRegistrationResult>;
  ensureVercelDns(domain: string, ipv4: string): Promise<{ ok: true } | { ok: false; error: string }>;
};

function mockQuote(domain: string, cost = 12): DomainQuote {
  return {
    domain,
    available: true,
    premium: false,
    currency: "USD",
    registrationCost: cost,
    renewalCost: cost,
  };
}

export class MockDomainProvider implements DomainProvider {
  async search(query: string) {
    const base = query
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 42);
    const stem = base || "eventloom";
    return [mockQuote(`${stem}.com`, 14), mockQuote(`${stem}.events`, 18), mockQuote(`${stem}.party`, 10)];
  }

  async check(domains: string[]) {
    return domains.map((domain) => mockQuote(domain, domain.endsWith(".events") ? 18 : 12));
  }

  async register(domain: string) {
    return { ok: true as const, providerId: `mock:${domain}` };
  }

  async ensureVercelDns() {
    return { ok: true as const };
  }
}

export function domainProvider(): DomainProvider {
  if (isOpenSrsConfigured()) return new OpenSrsDomainProvider();
  if (process.env.NODE_ENV !== "production") {
    return new MockDomainProvider();
  }
  throw new Error("domain_registrar_not_configured");
}

export async function verifyOpenSrsRegistrarAccess() {
  if (!isOpenSrsConfigured()) return false;
  try {
    await new OpenSrsDomainProvider().check(["example.com"]);
    return true;
  } catch { return false; }
}
