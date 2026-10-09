import type { MetadataRoute } from "next";
import { COMPARE_PATH, comparePath, competitors, GUIDE_PATH } from "@/lib/comparisons";
import { appUrl } from "@/lib/env";
import { legalDocuments } from "@/lib/legal-documents";
import { occasionPath, occasionTemplates, TEMPLATES_PATH } from "@/lib/occasion-templates";

const publicRoutes = [
  "/",
  "/rsvp-website",
  "/online-rsvp",
  "/event-website-builder",
  "/wedding-rsvp-website",
  "/birthday-event-website",
  "/private-event-website",
  TEMPLATES_PATH,
  ...occasionTemplates.map((occasion) => occasionPath(occasion.slug)),
  COMPARE_PATH,
  ...competitors.map((competitor) => comparePath(competitor.slug)),
  GUIDE_PATH,
  "/contact",
  "/legal",
  ...legalDocuments.map((document) => `/legal/${document.slug}`),
  "/privacy/request",
  "/ip",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl().replace(/\/$/, "");
  return publicRoutes.map((path, index) => ({
    url: `${base}${path}`,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: index === 0 ? 1 : 0.5,
  }));
}
