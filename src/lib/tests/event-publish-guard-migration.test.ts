import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDir = path.resolve(__dirname, "../../../supabase/migrations");
const migrations = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
const read = (name: string) => readFileSync(path.join(migrationsDir, name), "utf8");
const guard = migrations.find((name) => read(name).includes("create trigger events_protect_publish_state"));

describe("event publish guard (U2)", () => {
  it("guards every publish column on insert and update, for browser roles only", () => {
    expect(guard).toBeDefined();
    const sql = read(guard!);
    expect(sql).toMatch(/before insert or update of status, published_version_id, published_at, rsvp_open on public\.events/);
    expect(sql).toMatch(/current_user not in \('anon', 'authenticated'\) then return new/);
    for (const column of ["status", "published_version_id", "published_at", "rsvp_open"]) expect(sql).toContain(`new.${column} is distinct from old.${column}`);
  });

  it("no later migration re-creates browser write policies or grants on events", () => {
    for (const name of migrations.filter((file) => file > guard!)) {
      const sql = read(name);
      expect(sql, name).not.toMatch(/create policy[^;]*on public\.events\s+for (update|insert|all)/i);
      expect(sql, name).not.toMatch(/grant[^;]*(insert|update|all)[^;]*on (table )?public\.events\b[^;]*to[^;]*(authenticated|anon)/i);
    }
  });
});
