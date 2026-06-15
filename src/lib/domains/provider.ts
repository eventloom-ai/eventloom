import { env } from "@/lib/env";
import type { DomainQuote } from "@/lib/types";

export type DomainProvider = {
  search(query: string): Promise<DomainQuote[]>;
  check(domains: string[]): Promise<DomainQuote[]>;
  register(domain: string): Promise<{ ok: true; providerId: string } | { ok: false; error: string }>;
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
}

export class CloudflareRegistrarProvider implements DomainProvider {
  private baseUrl = "https://api.cloudflare.com/client/v4";

  private async request(path: string, init?: RequestInit) {
    const token = env.cloudflareRegistrarToken();
    const accountId = env.cloudflareAccountId();
    if (!token || !accountId) {
      throw new Error("Cloudflare registrar is not configured.");
    }

    const res = await fetch(`${this.baseUrl}/accounts/${accountId}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!res.ok) {
      throw new Error(`Cloudflare registrar request failed: ${res.status}`);
    }

    return res.json() as Promise<{ result?: { domains?: unknown[] }; errors?: unknown[] }>;
  }

  async search(query: string) {
    const data = await this.request(`/registrar/domain-search?q=${encodeURIComponent(query)}&limit=6`);
    return this.mapQuotes(data.result?.domains ?? []);
  }

  async check(domains: string[]) {
    const data = await this.request("/registrar/domain-check", {
      method: "POST",
      body: JSON.stringify({ domains }),
    });
    return this.mapQuotes(data.result?.domains ?? []);
  }

  async register(domain: string) {
    try {
      const data = await this.request("/registrar/registrations", {
        method: "POST",
        body: JSON.stringify({ domain_name: domain }),
      });
      return { ok: true as const, providerId: JSON.stringify(data.result ?? { domain }) };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "registration_failed" };
    }
  }

  private mapQuotes(items: unknown[]): DomainQuote[] {
    return items
      .map((item) => {
        const row = item as {
          name?: string;
          registrable?: boolean;
          tier?: string;
          pricing?: { currency?: string; registration_cost?: string; renewal_cost?: string };
        };
        return {
          domain: row.name ?? "",
          available: row.registrable === true,
          premium: row.tier === "premium",
          currency: row.pricing?.currency ?? "USD",
          registrationCost: Number(row.pricing?.registration_cost ?? 0),
          renewalCost: Number(row.pricing?.renewal_cost ?? 0),
        };
      })
      .filter((quote) => quote.domain);
  }
}

export function domainProvider(): DomainProvider {
  if (env.cloudflareAccountId() && env.cloudflareRegistrarToken()) {
    return new CloudflareRegistrarProvider();
  }

  return new MockDomainProvider();
}
