import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { env } from "@/lib/env";
import type { DomainProvider, DomainRegistrationResult } from "@/lib/domains/provider";
import type { DomainRegistrant } from "@/lib/domains/registrant";
import type { DomainQuote } from "@/lib/types";

type XmlValue = string | number | XmlObject | XmlArray;
interface XmlObject { [key: string]: XmlValue }
type XmlArray = Array<XmlValue>;
type OpenSrsReply = Record<string, unknown>;

function escapeXml(value: string | number) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function xmlItem(key: string, value: XmlValue): string {
  if (Array.isArray(value)) return `<item key="${escapeXml(key)}"><dt_array>${value.map((item, index) => xmlItem(String(index), item)).join("")}</dt_array></item>`;
  if (typeof value === "object") return `<item key="${escapeXml(key)}"><dt_assoc>${Object.entries(value as XmlObject).map(([childKey, child]) => xmlItem(childKey, child)).join("")}</dt_assoc></item>`;
  return `<item key="${escapeXml(key)}">${escapeXml(value)}</item>`;
}

function envelope(action: string, attributes: Record<string, XmlValue>) {
  const values: Record<string, XmlValue> = { protocol: "XCP", object: "DOMAIN", action, attributes };
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?><OPS_envelope><header><version>0.9</version></header><body><data_block><dt_assoc>${Object.entries(values).map(([key, value]) => xmlItem(key, value)).join("")}</dt_assoc></data_block></body></OPS_envelope>`;
}

function parseAssoc(node: unknown): Record<string, unknown> {
  const row = node as { item?: unknown[] | unknown } | null;
  const items = row?.item ? (Array.isArray(row.item) ? row.item : [row.item]) : [];
  return Object.fromEntries(items.map((raw) => {
    const item = raw as { key?: string; "#text"?: unknown; dt_assoc?: unknown; dt_array?: { item?: unknown[] | unknown } };
    if (item.dt_assoc) return [item.key ?? "", parseAssoc(item.dt_assoc)];
    if (item.dt_array) {
      const arrayItems = item.dt_array.item ? (Array.isArray(item.dt_array.item) ? item.dt_array.item : [item.dt_array.item]) : [];
      return [item.key ?? "", arrayItems.map((arrayItem) => {
        const value = arrayItem as { dt_assoc?: unknown; "#text"?: unknown };
        return value.dt_assoc ? parseAssoc(value.dt_assoc) : value["#text"] ?? "";
      })];
    }
    return [item.key ?? "", item["#text"] ?? ""];
  }));
}

export class OpenSrsDomainProvider implements DomainProvider {
  private parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", textNodeName: "#text", isArray: (name) => name === "item" });

  private async request(action: string, attributes: Record<string, XmlValue>): Promise<OpenSrsReply> {
    const username = env.openSrsUsername();
    const apiKey = env.openSrsApiKey();
    const url = env.openSrsApiUrl();
    if (!username || !apiKey || !url) throw new Error("opensrs_not_configured");
    const xml = envelope(action, attributes);
    const first = createHash("md5").update(xml + apiKey).digest("hex");
    const signature = createHash("md5").update(first + apiKey).digest("hex");
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "text/xml", "X-Username": username, "X-Signature": signature }, body: xml, signal: AbortSignal.timeout(15_000), cache: "no-store" });
    const body = await response.text();
    if (!response.ok) throw new Error(`opensrs_http_${response.status}`);
    const parsed = this.parser.parse(body) as { OPS_envelope?: { body?: { data_block?: { dt_assoc?: unknown } } } };
    const reply = parseAssoc(parsed.OPS_envelope?.body?.data_block?.dt_assoc);
    if (String(reply.is_success) !== "1") throw new Error(`opensrs_${String(reply.response_code || "error")}`);
    return reply;
  }

  private async quote(domain: string): Promise<DomainQuote> {
    const [lookup, registration, renewal] = await Promise.all([
      this.request("LOOKUP", { domain, no_cache: 1 }),
      this.request("GET_PRICE", { domain, period: 1, reg_type: "new" }),
      this.request("GET_PRICE", { domain, period: 1, reg_type: "renewal" }),
    ]);
    const lookupAttributes = (lookup.attributes ?? {}) as Record<string, unknown>;
    const registrationAttributes = (registration.attributes ?? {}) as Record<string, unknown>;
    const renewalAttributes = (renewal.attributes ?? {}) as Record<string, unknown>;
    return {
      domain,
      available: lookupAttributes.status === "available" && !lookupAttributes.has_claim,
      premium: String(registrationAttributes.is_registry_premium ?? "0") === "1",
      currency: "USD",
      registrationCost: Number(registrationAttributes.price ?? 0),
      renewalCost: Number(renewalAttributes.price ?? 0),
    };
  }

  async search(query: string) {
    const stem = query.toLowerCase().replace(/[^a-z0-9-]+/g, "").replace(/^-+|-+$/g, "").slice(0, 50) || "event";
    return this.check([`${stem}.com`, `${stem}.ca`, `${stem}.net`, `${stem}.org`, `${stem}.events`, `${stem}.party`]);
  }

  async check(domains: string[]) { return Promise.all(domains.slice(0, 10).map((domain) => this.quote(domain))); }

  async register(domain: string, registrant?: DomainRegistrant): Promise<DomainRegistrationResult> {
    if (!registrant) return { ok: false, error: "registrant_required" };
    const contact: Record<string, XmlValue> = {
      first_name: registrant.firstName, last_name: registrant.lastName, org_name: registrant.organization,
      email: registrant.email, phone: registrant.phone, address1: registrant.address1,
      address2: registrant.address2, city: registrant.city, state: registrant.state,
      postal_code: registrant.postalCode, country: registrant.country,
    };
    const profile = `el${createHash("sha256").update(domain).digest("hex").slice(0, 18)}`;
    const reply = await this.request("SW_REGISTER", {
      domain, reg_type: "new", period: 1, handle: "process", auto_renew: 0,
      f_lock_domain: 1, f_whois_privacy: 1, reg_username: profile,
      reg_password: randomBytes(24).toString("base64url"), dns_template: "*blank*",
      custom_nameservers: 0, custom_tech_contact: 0,
      contact_set: { owner: contact, admin: contact, billing: contact },
    });
    const attributes = (reply.attributes ?? {}) as Record<string, unknown>;
    const providerId = String(attributes.domain_id ?? attributes.id ?? "");
    return providerId ? { ok: true, providerId } : { ok: false, error: "opensrs_registration_incomplete" };
  }

  async ensureVercelDns(domain: string, ipv4: string) {
    try {
      await this.request("SET_DNS_ZONE", { domain, records: { A: [{ subdomain: "", ip_address: ipv4 }, { subdomain: "www", ip_address: ipv4 }] } });
      return { ok: true as const };
    } catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "opensrs_dns_failed" }; }
  }
}
