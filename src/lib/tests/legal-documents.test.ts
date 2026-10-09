import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { legalFooterLinks } from "@/components/global-legal-footer";
import { HOSTING_TERM_MONTHS, LAUNCH_PRICE_USD, RATE_LIMIT_RETENTION_DAYS, RSVP_RETENTION_DAYS_AFTER_EVENT, legalDocument, legalDocumentCanonicalText, legalDocuments, legalSectionBlocks } from "@/lib/legal-documents";
import { CHECKOUT_LEGAL_DOCUMENTS, DOMAIN_CHECKOUT_LEGAL_DOCUMENTS, LEGAL_BUSINESS, LEGAL_VERSION, ONBOARDING_LEGAL_DOCUMENTS, REQUIRED_ACTIVE_LEGAL_DOCUMENTS } from "@/lib/legal-version";
import { LAUNCH_PRICE_CENTS } from "@/lib/payments/billing";

const root = path.resolve(__dirname, "../../..");
const migrationsDir = path.join(root, "supabase/migrations");
const migrations = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
const read = (relative: string) => readFileSync(path.join(root, relative), "utf8");

function sha256(text: string) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** The newest migration with a `-- legal-documents:start` block defines the active legal versions. */
function latestLegalMigration() {
  const file = [...migrations].reverse().find((name) => readFileSync(path.join(migrationsDir, name), "utf8").includes("-- legal-documents:start"));
  if (!file) throw new Error("no migration inserts legal_documents rows");
  const sql = readFileSync(path.join(migrationsDir, file), "utf8");
  const block = sql.split("-- legal-documents:start")[1]?.split("-- legal-documents:end")[0] ?? "";
  const rows = [...block.matchAll(/\(\s*'([^']+)',\s*'([^']+)',\s*'((?:[^']|'')+)',\s*'([0-9a-f]{64})',\s*'(\w+)'/g)]
    .map(([, key, version, title, hash, status]) => ({ key, version, title: title.replace(/''/g, "'"), hash, status }));
  return { file, sql, rows };
}

function expectedRows() {
  return legalDocuments.map((document) => `  ('${document.slug}', '${LEGAL_VERSION}', '${document.title.replace(/'/g, "''")}', '${sha256(legalDocumentCanonicalText(document))}', 'active', now())`).join(",\n");
}

describe("legal documents", () => {
  it("have unique slugs and non-empty content, and every section renders to blocks", () => {
    const slugs = legalDocuments.map((document) => document.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const document of legalDocuments) {
      expect(document.title.trim(), document.slug).not.toBe("");
      expect(document.summary.trim(), document.slug).not.toBe("");
      expect(document.sections.length, document.slug).toBeGreaterThan(0);
      for (const section of document.sections) {
        const blocks = legalSectionBlocks(section.body);
        expect(blocks.length, `${document.slug}: ${section.heading}`).toBeGreaterThan(0);
        for (const block of blocks) {
          if (block.kind === "list") expect(block.items.every((item) => item.trim().length > 0)).toBe(true);
          else expect(block.text.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("include every policy Stripe, the footer and checkout point to", () => {
    for (const slug of ["terms", "privacy", "refunds", "acceptable-use", "reporting", "copyright", "cookies", "subprocessors", "dpa", "domains", "accessibility", "security"]) {
      expect(legalDocument(slug), slug).toBeDefined();
    }
    for (const [, href] of legalFooterLinks) {
      if (href.startsWith("/legal/")) expect(legalDocument(href.slice("/legal/".length)), href).toBeDefined();
    }
    for (const key of [...ONBOARDING_LEGAL_DOCUMENTS, ...DOMAIN_CHECKOUT_LEGAL_DOCUMENTS, ...REQUIRED_ACTIVE_LEGAL_DOCUMENTS]) expect(legalDocument(key), key).toBeDefined();
  });

  it("state the business identity and contact", () => {
    for (const slug of ["terms", "privacy", "refunds"]) {
      const text = legalDocumentCanonicalText(legalDocument(slug)!);
      expect(text, slug).toContain(LEGAL_BUSINESS.email);
      expect(text, slug).toContain(LEGAL_BUSINESS.mailingAddress);
    }
  });

  it("carry no pre-launch placeholders", () => {
    for (const document of legalDocuments) {
      const text = legalDocumentCanonicalText(document);
      expect(text, document.slug).not.toMatch(/counsel approval|will be (published|finalized) before|pre-launch|TODO|TBD|\.invalid/i);
    }
  });

  it("quote the real launch price and hosting term", () => {
    expect(LAUNCH_PRICE_USD * 100).toBe(LAUNCH_PRICE_CENTS);
    expect(read("supabase/migrations/20260722015511_atomic_launch_fulfillment.sql")).toContain("fulfilled_at + interval '1 year'");
    expect(HOSTING_TERM_MONTHS).toBe(12);
  });

  it("quote the retention periods the database enforces", () => {
    const retention = [...migrations].reverse().map((name) => readFileSync(path.join(migrationsDir, name), "utf8")).find((sql) => sql.includes("function public.set_event_retention_deadline"));
    expect(retention).toContain(`new.rsvp_purge_at := new.event_ends_at + interval '${RSVP_RETENTION_DAYS_AFTER_EVENT} days'`);
    const rateLimits = [...migrations].reverse().map((name) => readFileSync(path.join(migrationsDir, name), "utf8")).find((sql) => sql.includes("private.rsvp_rate_limits") && sql.includes("requested_at < now() - interval"));
    expect(rateLimits).toContain(`requested_at < now() - interval '${RATE_LIMIT_RETENTION_DAYS} days'`);
    expect(read("src/app/api/cron/maintenance/route.ts")).toContain(`Date.now() - ${RATE_LIMIT_RETENTION_DAYS} * 24 * 60 * 60 * 1000`);
  });
});

describe("legal document versioning", () => {
  it("the newest legal migration activates exactly the current documents with matching content hashes", () => {
    const { file, rows } = latestLegalMigration();
    const message = `${file} is out of date with src/lib/legal-documents.ts. Bump LEGAL_VERSION if the text changed, and use these rows:\n${expectedRows()}\n`;
    expect(rows.map((row) => row.key).sort(), message).toEqual(legalDocuments.map((document) => document.slug).sort());
    for (const document of legalDocuments) {
      const row = rows.find((candidate) => candidate.key === document.slug)!;
      expect(row.version, message).toBe(LEGAL_VERSION);
      expect(row.status, message).toBe("active");
      expect(row.title, message).toBe(document.title);
      expect(row.hash, `${document.slug}: ${message}`).toBe(sha256(legalDocumentCanonicalText(document)));
    }
  });

  it("the newest legal migration retires every other version", () => {
    const { sql } = latestLegalMigration();
    expect(sql).toMatch(new RegExp(`update public\\.legal_documents\\s+set status = 'retired'\\s+where version <> '${LEGAL_VERSION}'`));
  });

  it("canonical text depends on the version, so a bump changes every hash", () => {
    const terms = legalDocument("terms")!;
    expect(sha256(legalDocumentCanonicalText(terms, "other"))).not.toBe(sha256(legalDocumentCanonicalText(terms)));
  });

  it("no code path pins an old legal version", () => {
    for (const file of ["src/app/api/stripe/checkout/route.ts", "src/app/api/events/[eventId]/publish/route.ts", "src/app/api/health/ready/route.ts", "src/components/auth-form.tsx", "src/components/studio-toolbar.tsx"]) {
      const source = read(file);
      expect(source, file).not.toMatch(/\d{4}-\d{2}-\d{2}-beta/);
      expect(source, file).toContain("LEGAL_VERSION");
    }
  });

  it("creator onboarding accepts the same documents as the accept route and the signup trigger", () => {
    const route = read("src/app/api/legal/accept/route.ts");
    expect(route).toContain(`.in("document_key", [${ONBOARDING_LEGAL_DOCUMENTS.map((key) => `"${key}"`).join(", ")}])`);
    const trigger = [...migrations].reverse().map((name) => readFileSync(path.join(migrationsDir, name), "utf8")).find((sql) => sql.includes("function public.handle_new_user"));
    expect(trigger).toContain(`d.document_key in (${ONBOARDING_LEGAL_DOCUMENTS.map((key) => `'${key}'`).join(", ")})`);
  });

  it("the launch dialog links the Terms, Refund Policy and Privacy Policy next to the pay button", () => {
    const toolbar = read("src/components/studio-toolbar.tsx");
    for (const href of ["/legal/terms", "/legal/refunds", "/legal/privacy"]) expect(toolbar).toContain(`href="${href}"`);
  });

  it("checkout requires acceptance of the refund policy", () => {
    expect(CHECKOUT_LEGAL_DOCUMENTS).toContain("refunds");
    expect(DOMAIN_CHECKOUT_LEGAL_DOCUMENTS).toContain("refunds");
    expect(REQUIRED_ACTIVE_LEGAL_DOCUMENTS).toEqual(expect.arrayContaining([...CHECKOUT_LEGAL_DOCUMENTS, ...ONBOARDING_LEGAL_DOCUMENTS]));
  });
});
