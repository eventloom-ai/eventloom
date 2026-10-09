import { describe, expect, it } from "vitest";
import { LAUNCH_PRICE_CENTS } from "@/lib/payments/billing";
import { seoLandingPages } from "@/lib/seo-landing-pages";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  faqPageJsonLd,
  itemListJsonLd,
  serializeJsonLd,
  softwareApplicationJsonLd,
} from "@/lib/structured-data";

const site = "https://eventloom.co/";

describe("structured data helpers", () => {
  it("builds absolute URLs without doubled slashes", () => {
    expect(absoluteUrl(site)).toBe("https://eventloom.co/");
    expect(absoluteUrl("https://eventloom.co", "/templates")).toBe("https://eventloom.co/templates");
    expect(absoluteUrl(site, "templates/wedding")).toBe("https://eventloom.co/templates/wedding");
  });

  it("maps every visible FAQ to a Question with an accepted Answer", () => {
    for (const page of Object.values(seoLandingPages)) {
      const data = faqPageJsonLd(page.faqs, absoluteUrl(site, `/${page.slug}`));
      expect(data["@context"]).toBe("https://schema.org");
      expect(data["@type"]).toBe("FAQPage");
      const entities = data.mainEntity as { "@type": string; name: string; acceptedAnswer: { "@type": string; text: string } }[];
      expect(entities).toHaveLength(page.faqs.length);
      entities.forEach((entity, index) => {
        expect(entity["@type"]).toBe("Question");
        expect(entity.name).toBe(page.faqs[index].question);
        expect(entity.acceptedAnswer).toEqual({ "@type": "Answer", text: page.faqs[index].answer });
      });
    }
    expect(() => faqPageJsonLd([])).toThrow();
  });

  it("describes the product with its real one-time price", () => {
    const data = softwareApplicationJsonLd("https://eventloom.co");
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Eventloom",
      operatingSystem: "Web",
      url: "https://eventloom.co/",
      publisher: { "@id": "https://eventloom.co/#organization" },
      offers: { "@type": "Offer", price: "20", priceCurrency: "USD" },
    });
    expect(LAUNCH_PRICE_CENTS).toBe(2_000);
    expect(JSON.stringify(data)).not.toMatch(/free/i);
  });

  it("numbers breadcrumb and item list positions from one", () => {
    const crumbs = breadcrumbJsonLd(site, [{ name: "Eventloom", path: "/" }, { name: "Templates", path: "/templates" }]);
    expect(crumbs.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Eventloom", item: "https://eventloom.co/" },
      { "@type": "ListItem", position: 2, name: "Templates", item: "https://eventloom.co/templates" },
    ]);
    const list = itemListJsonLd(site, "Templates", [{ name: "Wedding", path: "/templates/wedding" }]);
    expect(list).toMatchObject({ "@type": "ItemList", numberOfItems: 1, itemListElement: [{ position: 1, url: "https://eventloom.co/templates/wedding" }] });
  });

  it("serializes safely for an inline script element", () => {
    const json = serializeJsonLd(faqPageJsonLd([{ question: "</script><script>alert(1)</script>", answer: "Yes." }]));
    expect(json).not.toContain("</script");
    expect(JSON.parse(json).mainEntity[0].name).toBe("</script><script>alert(1)</script>");
  });
});
