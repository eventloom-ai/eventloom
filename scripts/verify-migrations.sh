#!/bin/bash
# Replays supabase/migrations against a throwaway local Postgres 16 with stubbed
# Supabase schemas (auth, storage, roles).
#
# Migrations from version $1 onwards must apply cleanly (ON_ERROR_STOP).
# Older migrations run without ON_ERROR_STOP. The ones listed in KNOWN_LEGACY
# are already applied in production and are known to fail part-way on a fresh
# database (N12 — see supabase/README.md); their errors are reported, not fatal.
# Any OTHER older migration that errors fails the run, so a new replay problem
# can't hide behind the legacy ones.
#
# usage: scripts/verify-migrations.sh <first-strict-version, e.g. 20261008000000>
#        VERBOSE=1 scripts/verify-migrations.sh ...   # print every legacy error line
set -u
STRICT_FROM="${1:-99999999999999}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export LC_ALL=en_US.UTF-8 PATH=/opt/homebrew/opt/postgresql@16/bin:$PATH
DATA="${TMPDIR:-/tmp}/eventloom-pg-verify"; PORT=54329

# Applied in production; must never be edited. Remove an entry only if it replays cleanly.
KNOWN_LEGACY=(
  # Grants on / alters public.consume_rsvp_rate_limit and public.valid_guest_names, which only exist in
  # production (created before migrations were tracked); nothing in this folder creates them first.
  20260722052902_security_advisor_remediation.sql
  # Policy on private.rsvps, which 20260722052756 only creates by moving a production-only public.rsvps.
  20260722054759_quarantined_rsvp_deny_policy.sql
  # Recreates consume_rsvp_rate_limit over private.legacy_rsvp_rate_limits, likewise moved from production only.
  20260731140918_fix_rsvp_rate_limit_functions.sql
)
is_known_legacy() { local name; for name in "${KNOWN_LEGACY[@]}"; do [ "$name" = "$1" ] && return 0; done; return 1; }

if ! pg_isready -h 127.0.0.1 -p $PORT >/dev/null 2>&1; then
  rm -rf "$DATA" && initdb -D "$DATA" -U postgres -A trust >/dev/null
  printf "unix_socket_directories = ''\nport = $PORT\n" >> "$DATA/postgresql.conf"
  pg_ctl -D "$DATA" -l "$DATA.log" start >/dev/null && sleep 2
fi
p() { psql -h 127.0.0.1 -p $PORT -U postgres -d eventloom -q "$@"; }
psql -h 127.0.0.1 -p $PORT -U postgres -qc "drop database if exists eventloom" -c "create database eventloom" 2>/dev/null
p -v ON_ERROR_STOP=1 -f "$ROOT/scripts/db/supabase-stub.sql" || exit 1
failed=0
for f in "$ROOT"/supabase/migrations/*.sql; do
  name=$(basename "$f"); v=${name%%_*}
  if [ "$v" \< "$STRICT_FROM" ]; then
    errs=$(p -f "$f" 2>&1 | grep ERROR | sed "s|^psql:$ROOT/||")
    if [ -z "$errs" ]; then
      is_known_legacy "$name" && echo "known-legacy (now clean, remove from KNOWN_LEGACY): $name"
    elif is_known_legacy "$name"; then
      echo "known-legacy: $name: $(echo "$errs" | wc -l | tr -d ' ') error(s); first: $(echo "$errs" | head -1 | cut -c1-160)"
      [ -n "${VERBOSE:-}" ] && echo "$errs" | sed 's/^/    /'
    else
      echo "FAILED (unexpected error in a pre-strict migration): $name"; echo "$errs" | sed 's/^/    /'; failed=1
    fi
  else
    out=$(p -v ON_ERROR_STOP=1 -f "$f" 2>&1) || { echo "FAILED: $name"; echo "$out" | grep -v NOTICE; failed=1; continue; }
    echo "ok: $name"
  fi
done
echo "Connect for manual checks: psql -h 127.0.0.1 -p $PORT -U postgres -d eventloom"
exit $failed
