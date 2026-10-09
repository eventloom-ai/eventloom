import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RESERVED_SLUGS } from "@/lib/reserved-slugs";

const migrationsDir = path.resolve(__dirname, "../../../supabase/migrations");

// The newest migration that (re)defines events_slug_not_reserved is the one in force.
function latestReservedSlugMigration() {
  const file = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .reverse()
    .find((name) => readFileSync(path.join(migrationsDir, name), "utf8").includes("-- reserved-slugs:start"));
  if (!file) throw new Error("no migration defines the reserved slug list");
  return { file, sql: readFileSync(path.join(migrationsDir, file), "utf8") };
}

describe("reserved slug DB constraint", () => {
  it("lists exactly RESERVED_SLUGS", () => {
    const { file, sql } = latestReservedSlugMigration();
    const block = sql.split("-- reserved-slugs:start")[1]?.split("-- reserved-slugs:end")[0] ?? "";
    const slugs = [...block.matchAll(/'([^']*)'/g)].map((match) => match[1]);

    expect(new Set(slugs).size, `${file} has duplicate slugs`).toBe(slugs.length);
    expect([...slugs].sort()).toEqual([...RESERVED_SLUGS].sort());
  });

  it("only checks inserts and slug changes so legacy rows stay editable", () => {
    const { sql } = latestReservedSlugMigration();
    expect(sql).toMatch(/before insert or update of slug on public\.events/);
    expect(sql).toMatch(/new\.slug is not distinct from old\.slug then return new/);
  });
});
