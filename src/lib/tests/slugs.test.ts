import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseBuildForm } from "@/lib/agent/parse-build-form";
import { startBuildJob } from "@/lib/agent/start-build";
import { createEventRecord } from "@/lib/agent/tools";
import { RESERVED_SLUGS, isReservedSlug } from "@/lib/reserved-slugs";
import { seoLandingPages } from "@/lib/seo-landing-pages";
import { fallbackSlug, normalizeSlugInput, normalizeSlugTyping, suggestSlug, suggestSlugOrFallback } from "@/lib/slug-suggest";
import { slugSchema } from "@/lib/validation";

describe("reserved slugs", () => {
  it("covers every top-level app route and SEO landing page", () => {
    const routes = readdirSync(path.resolve(__dirname, "../../app"))
      .filter((entry) => !entry.startsWith("[") && !/^(?:layout|page|globals|loading|error|not-found)\./.test(entry))
      .map((entry) => entry.replace(/\.[^.]+$/, ""));
    expect(routes.length).toBeGreaterThan(15);
    for (const route of [...routes, ...Object.values(seoLandingPages).map((page) => page.slug)]) expect(RESERVED_SLUGS.has(route), route).toBe(true);
    for (const name of ["www", "mail", "status", "support", "help", "billing", "docs", "blog", "templates", "pricing"]) expect(isReservedSlug(name), name).toBe(true);
  });

  it("is rejected by the schema and every server create path", async () => {
    expect(slugSchema.safeParse("login").success).toBe(false);
    expect(slugSchema.safeParse("Rsvp-Website").success).toBe(false);
    expect(slugSchema.safeParse("maya-and-adam").success).toBe(true);
    expect(await createEventRecord({ slug: "admin", config: {} as never })).toEqual({ event: null, error: "slug_reserved" });
    const parsed = await parseBuildForm(null, { prompt: "A party", slug: "api" });
    expect(await startBuildJob(parsed, "user-1")).toEqual({ ok: false, error: "slug_reserved", status: 409 });
  });

  it("is never suggested", () => {
    expect(suggestSlug("RSVP website")).toBe("rsvp-website-event");
    expect(suggestSlug("Pricing")).toBe("pricing-event");
    expect(suggestSlug("Maya Adam garden wedding")).toBe("maya-adam-garden");
  });
});

describe("slug input", () => {
  it("lets a hyphen be typed and trims it on blur or submit", () => {
    expect(normalizeSlugTyping("My-")).toBe("my-");
    expect(normalizeSlugTyping("-my  party-")).toBe("my-party-");
    expect(normalizeSlugInput("my-party-")).toBe("my-party");
  });

  it("falls back to a stable event address when the brief has no ASCII words", () => {
    const slug = suggestSlugOrFallback("حفل زفاف أحمد وسارة");
    expect(slug).toMatch(/^event-[a-z0-9]{6}$/);
    expect(slug).toBe(fallbackSlug("حفل زفاف أحمد وسارة"));
    expect(slug).not.toBe(fallbackSlug("حفل خطوبة"));
    expect(slugSchema.safeParse(slug).success).toBe(true);
    expect(suggestSlugOrFallback("   ")).toBe("");
  });
});
