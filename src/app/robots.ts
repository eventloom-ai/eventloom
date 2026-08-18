import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/legal/", "/contact", "/privacy/request", "/ip"],
      disallow: ["/admin", "/api/", "/app", "/auth/", "/login", "/signup", "/studio", "/sites/"],
    },
    sitemap: `${appUrl()}/sitemap.xml`,
    host: appUrl(),
  };
}
