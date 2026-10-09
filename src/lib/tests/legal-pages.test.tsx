import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import LegalPage, { generateStaticParams } from "@/app/legal/[document]/page";
import LegalIndexPage from "@/app/legal/page";
import { LEGAL_BUSINESS, LEGAL_VERSION, legalDocuments } from "@/lib/legal-documents";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));

function decode(html: string) {
  return html.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, "\"").replace(/&amp;/g, "&");
}

describe("legal pages", () => {
  it("prerender every document", () => {
    expect(generateStaticParams().map((params) => params.document).sort()).toEqual(legalDocuments.map((document) => document.slug).sort());
  });

  it.each(legalDocuments.map((document) => [document.slug, document] as const))("renders %s with every section, the version and the contact details", async (slug, document) => {
    const html = decode(renderToStaticMarkup(await LegalPage({ params: Promise.resolve({ document: slug }) })));
    expect(html).toContain(document.title);
    expect(html).toContain(`Version ${LEGAL_VERSION}`);
    expect(html).toContain(LEGAL_BUSINESS.email);
    expect(html).toContain(LEGAL_BUSINESS.mailingAddress);
    for (const section of document.sections) expect(html).toContain(section.heading);
    expect(html).not.toMatch(/Pre-launch|not represented as lawyer-approved/i);
  });

  it("renders list sections as lists", async () => {
    const html = renderToStaticMarkup(await LegalPage({ params: Promise.resolve({ document: "refunds" }) }));
    expect(html).toMatch(/<ul[^>]*><li>Publishing an event page costs US\$20/);
  });

  it("404s unknown documents", async () => {
    await expect(LegalPage({ params: Promise.resolve({ document: "nope" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("lists every document on the index", () => {
    const html = decode(renderToStaticMarkup(<LegalIndexPage />));
    for (const document of legalDocuments) expect(html).toContain(`href="/legal/${document.slug}"`);
    expect(html).toContain('href="/privacy/request"');
  });
});
