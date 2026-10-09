import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";
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
  "/contact",
  "/legal",
  "/legal/terms",
  "/legal/privacy",
  "/legal/domains",
  "/legal/acceptable-use",
  "/legal/dpa",
  "/legal/subprocessors",
  "/legal/cookies",
  "/legal/accessibility",
  "/legal/security",
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
