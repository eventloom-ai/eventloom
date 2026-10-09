# Supabase

`migrations/` is the schema history of the production project. Migrations are written here and applied to
production only with the owner's approval (see `docs/ops/README.md`), after a local replay with
`scripts/verify-migrations.sh`.

## Verifying a new migration

```sh
scripts/verify-migrations.sh 20261009010000   # version of the first migration that must apply cleanly
```

The script starts (or reuses) a throwaway Postgres 16 on port 54329, loads `scripts/db/supabase-stub.sql`
(minimal `auth`, `storage`, `extensions` schemas and Supabase roles) and replays every migration in order.
Migrations at or after the given version run with `ON_ERROR_STOP` and must print `ok:`. Older migrations are
allowed to fail only if they are listed in `KNOWN_LEGACY` in the script; any other error fails the run.
`VERBOSE=1` prints every legacy error line. Afterwards the database stays up for manual `psql` checks.

## Known issue: the history is not replayable on a fresh database (N12)

Production existed before migrations were tracked. A few objects were created there outside this folder:
the tables `public.rsvps` and `public.rsvp_rate_limits` and the functions `public.consume_rsvp_rate_limit` and
`public.valid_guest_names`. `20260722052756_security_legal_production_hardening` moves the two tables into
`private` (renaming the limiter table to `private.legacy_rsvp_rate_limits`) only `if` they exist, so on a fresh
database they never appear, and three later migrations fail part-way:

| Migration | Fails on |
| --- | --- |
| `20260722052902_security_advisor_remediation` | `grant`/`revoke` on `consume_rsvp_rate_limit`, `alter function valid_guest_names` — functions that only exist in production (the backlog's "references a function created later") |
| `20260722054759_quarantined_rsvp_deny_policy` | policy on `private.rsvps` |
| `20260731140918_fix_rsvp_rate_limit_functions` | recreates `consume_rsvp_rate_limit` over `private.legacy_rsvp_rate_limits` |

Everything that fails concerns those legacy objects; the app uses none of them (RSVPs go through
`submit_public_rsvp` and `private.rsvp_rate_limits`). Skipping the failing statements therefore yields the
current application schema, minus the legacy objects.

**These migrations are already applied in production. Do not edit them** — changing an applied migration does
not change production and makes the history lie about what ran there.

### Workarounds

- **Verifying migrations locally:** use `scripts/verify-migrations.sh`, which tolerates exactly the
  `KNOWN_LEGACY` errors.
- **A fresh database (local stack, new project, preview branch):** `supabase db reset` / `supabase start`
  stop at the first error, so replay the files with `psql` *without* `ON_ERROR_STOP` (as the script does for
  pre-strict migrations), then record them as applied with
  `supabase migration repair --status applied <version>` if the CLI's history table is used.
- **If a fully replayable history is needed later:** add a new, idempotent bootstrap migration that creates
  the legacy objects `if not exists`, dated *before* `20260722052902`. `supabase db push` will then ask for
  `--include-all` because the file sorts before already-applied ones; on production it would be a no-op. This
  needs owner approval and has not been done.

## Constraint notes

- `events_slug_not_reserved` (`20261009010000_reserved_event_slugs`) mirrors `RESERVED_SLUGS` in
  `src/lib/reserved-slugs.ts`; `src/lib/tests/reserved-slugs-migration.test.ts` fails if they drift. It is
  added `NOT VALID`. Because Postgres re-checks a CHECK constraint on every update of a row, an existing event
  whose slug is reserved could not be updated at all after this migration — check for such rows first (query
  in the migration header) and rename them, then `validate constraint`.
