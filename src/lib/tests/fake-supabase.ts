/**
 * A small in-memory stand-in for the Supabase service client, for route tests that should run the real store code
 * (studio-store, rsvp-deadline-sync) instead of mocking it away. Supports the query-builder calls those modules make.
 */
type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

export type FakeSupabase = ReturnType<typeof createFakeSupabase>;

export function createFakeSupabase(seed: Record<string, Row[]> = {}) {
  const tables = new Map<string, Row[]>(Object.entries(seed).map(([name, rows]) => [name, rows.map((row) => ({ ...row }))]));
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const rpcHandlers = new Map<string, (args: Record<string, unknown>) => { data: unknown; error: unknown }>();
  let sequence = 0;
  const table = (name: string) => {
    if (!tables.has(name)) tables.set(name, []);
    return tables.get(name)!;
  };

  function from(name: string) {
    let action: "select" | "insert" | "update" | "delete" = "select";
    let payload: Row | Row[] | null = null;
    let returning = false;
    const filters: Filter[] = [];
    let order: { column: string; ascending: boolean } | null = null;
    let limit: number | null = null;
    let countOnly = false;

    const run = () => {
      const rows = table(name);
      if (action === "insert") {
        const inserted = (Array.isArray(payload) ? payload : [payload!]).map((row): Row => {
          sequence += 1;
          return { id: `${name}-${sequence}`, created_at: new Date(Date.UTC(2027, 0, 1, 0, 0, sequence)).toISOString(), ...row };
        });
        // (job_id, sequence) is unique on generation_job_events.
        if (name === "generation_job_events" && inserted.some((row) => rows.some((existing) => existing.job_id === row.job_id && existing.sequence === row.sequence))) {
          return { data: null, error: { code: "23505", message: "duplicate" } };
        }
        rows.push(...inserted);
        return { data: returning ? inserted : null, error: null };
      }
      let matched = rows.filter((row) => filters.every((filter) => filter(row)));
      if (action === "update") {
        matched.forEach((row) => Object.assign(row, payload));
        return { data: returning ? matched.map((row) => ({ ...row })) : null, error: null };
      }
      if (action === "delete") {
        tables.set(name, rows.filter((row) => !matched.includes(row)));
        return { data: null, error: null };
      }
      if (order) {
        const { column, ascending } = order;
        matched = [...matched].sort((a, b) => (String(a[column]) < String(b[column]) ? -1 : String(a[column]) > String(b[column]) ? 1 : 0) * (ascending ? 1 : -1));
      }
      if (countOnly) return { data: null, count: matched.length, error: null };
      if (limit !== null) matched = matched.slice(0, limit);
      return { data: matched.map((row) => ({ ...row })), error: null };
    };

    const builder = {
      select: (_columns?: string, options?: { count?: string; head?: boolean }) => { returning = true; countOnly = Boolean(options?.count && options.head); return builder; },
      insert: (values: Row | Row[]) => { action = "insert"; payload = values; return builder; },
      update: (values: Row) => { action = "update"; payload = values; return builder; },
      delete: () => { action = "delete"; return builder; },
      eq: (column: string, value: unknown) => { filters.push((row) => row[column] === value); return builder; },
      neq: (column: string, value: unknown) => { filters.push((row) => row[column] !== value); return builder; },
      is: (column: string, value: unknown) => { filters.push((row) => (row[column] ?? null) === value); return builder; },
      in: (column: string, values: unknown[]) => { filters.push((row) => values.includes(row[column])); return builder; },
      not: (column: string, operator: string, value: unknown) => { filters.push((row) => operator === "is" ? (row[column] ?? null) !== value : row[column] !== value); return builder; },
      lt: (column: string, value: unknown) => { filters.push((row) => String(row[column]) < String(value)); return builder; },
      gte: (column: string, value: unknown) => { filters.push((row) => String(row[column]) >= String(value)); return builder; },
      abortSignal: () => builder,
      gt: (column: string, value: unknown) => { filters.push((row) => Number(row[column]) > Number(value)); return builder; },
      order: (column: string, options: { ascending?: boolean } = {}) => { order = { column, ascending: options.ascending ?? true }; return builder; },
      limit: (count: number) => { limit = count; return builder; },
      single: async () => {
        const result = run();
        const rows = Array.isArray(result.data) ? result.data : [];
        return rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: result.error ?? { message: "not_single" } };
      },
      maybeSingle: async () => {
        const result = run();
        const rows = Array.isArray(result.data) ? result.data : [];
        return { data: rows[0] ?? null, error: result.error };
      },
      then: (resolve: (value: { data: unknown; error: unknown; count?: number }) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve().then(run).then(resolve, reject),
    };
    return builder;
  }

  return {
    tables,
    rpcCalls,
    table,
    onRpc: (name: string, handler: (args: Record<string, unknown>) => { data: unknown; error: unknown }) => rpcHandlers.set(name, handler),
    client: {
      from,
      rpc: async (name: string, args: Record<string, unknown>) => {
        rpcCalls.push({ name, args });
        return rpcHandlers.get(name)?.(args) ?? { data: null, error: { message: `no handler for ${name}` } };
      },
    },
  };
}
