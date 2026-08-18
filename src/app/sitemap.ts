import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

const publicRoutes = [
  "/",
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
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl().replace(/\/$/, "");
  return publicRoutes.map((path, index) => ({
    url: `${base}${path}`,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: index === 0 ? 1 : 0.5,
  }));
}
