import { LAUNCH_PRICE_CENTS } from "@/lib/payments/billing";

export type JsonLd = { "@context": "https://schema.org" } & Record<string, unknown>;
export type FaqItem = { question: string; answer: string };

const CONTEXT = "https://schema.org" as const;

export function absoluteUrl(siteUrl: string, path = "/") {
  const base = siteUrl.replace(/\/$/, "");
  return path === "/" ? `${base}/` : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** FAQPage schema. The questions and answers must match the FAQ text visible on the page. */
export function faqPageJsonLd(faqs: readonly FaqItem[], url?: string): JsonLd {
  if (!faqs.length) throw new Error("faqPageJsonLd needs at least one question.");
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    ...(url ? { url } : {}),
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/** The product and its one real price: one published event for one year. */
export function softwareApplicationJsonLd(siteUrl: string): JsonLd {
  const url = absoluteUrl(siteUrl);
  return {
    "@context": CONTEXT,
    "@type": "SoftwareApplication",
    "@id": `${url}#software`,
    name: "Eventloom",
    url,
    applicationCategory: "LifestyleApplication",
    applicationSubCategory: "Event website and RSVP builder",
    operatingSystem: "Web",
    description: "Create an event website from a short description, share one link, and collect guest RSVPs without guests needing an account.",
    publisher: { "@id": `${url}#organization` },
    offers: {
      "@type": "Offer",
      name: "One published event for one year",
      price: String(LAUNCH_PRICE_CENTS / 100),
      priceCurrency: "USD",
      url,
      availability: "https://schema.org/InStock",
    },
  };
}

export function breadcrumbJsonLd(siteUrl: string, items: readonly { name: string; path: string }[]): JsonLd {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(siteUrl, item.path),
    })),
  };
}

export function itemListJsonLd(siteUrl: string, name: string, items: readonly { name: string; path: string }[]): JsonLd {
  return {
    "@context": CONTEXT,
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(siteUrl, item.path),
    })),
  };
}

/** Serializes JSON-LD for an inline script: `<` is escaped so page text can never close the script element. */
export function serializeJsonLd(data: JsonLd | readonly JsonLd[]) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
