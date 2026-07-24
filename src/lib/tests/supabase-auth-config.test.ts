import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("hosted auth redirect contract", () => {
  it("keeps Eventloom's production origin and dynamic callback path allow-listed", () => {
    const config = readFileSync("supabase/config.toml", "utf8");

    expect(config).toContain(
      'site_url = "https://eventloom-beta.vercel.app"',
    );
    expect(config).toContain(
      '"https://eventloom-beta.vercel.app/auth/callback**"',
    );
  });
});
