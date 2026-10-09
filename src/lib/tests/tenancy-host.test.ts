import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ client: null as unknown, queries: [] as Array<{ table: string; filters: string[] }> }));

vi.mock("@/lib/supabase/server", () => ({ serviceSupabase: () => mocks.client }));
vi.mock("@/lib/env", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/env")>()), rootDomain: () => "eventloom.co" }));

import { resolveEventByHost } from "@/lib/tenancy";

// Records every filter applied per table; all lookups miss so resolution stops after the first query.
function createClient() {
  return {
    from: (table: string) => {
      const query = { table, filters: [] as string[] };
      mocks.queries.push(query);
      const builder: Record<string, unknown> = {};
      for (const method of ["select", "eq", "in", "not", "order", "limit"]) {
        builder[method] = (...args: unknown[]) => {
          query.filters.push(`${method}:${JSON.stringify(args)}`);
          return builder;
        };
      }
      builder.maybeSingle = async () => ({ data: null, error: null });
      return builder;
    },
  };
}

describe("resolveEventByHost", () => {
  beforeEach(() => {
    mocks.queries = [];
    mocks.client = createClient();
  });

  it("resolves platform subdomains by slug without consulting the domains table", async () => {
    await resolveEventByHost("smith-wedding.eventloom.co");
    expect(mocks.queries.map((query) => query.table)).toEqual(["events"]);
    expect(mocks.queries[0]?.filters).toContain('eq:["slug","smith-wedding"]');
  });

  it("only routes custom domains attached by paid fulfillment", async () => {
    await resolveEventByHost("smithwedding.com");
    expect(mocks.queries.map((query) => query.table)).toEqual(["domains"]);
    expect(mocks.queries[0]?.filters).toEqual(expect.arrayContaining([
      'eq:["domain","smithwedding.com"]',
      'not:["order_id","is",null]',
      'in:["status",["vercel_pending","ready"]]',
    ]));
  });

  it("never falls back to a slug lookup for unknown custom domains", async () => {
    await expect(resolveEventByHost("smith-wedding.attacker.com")).resolves.toBeNull();
    expect(mocks.queries.some((query) => query.table === "events")).toBe(false);
  });
});
