#!/bin/bash
# Replays supabase/migrations against a throwaway local Postgres 16 with stubbed
# Supabase schemas (auth, storage, roles). Older migrations may log known errors
# (see docs/ops/BACKLOG.md N12); migrations newer than $1 must apply cleanly.
# usage: scripts/verify-migrations.sh <first-strict-version, e.g. 20261008000000>
set -u
STRICT_FROM="${1:-99999999999999}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export LC_ALL=en_US.UTF-8 PATH=/opt/homebrew/opt/postgresql@16/bin:$PATH
DATA="${TMPDIR:-/tmp}/eventloom-pg-verify"; PORT=54329
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
  v=$(basename "$f" | cut -d_ -f1)
  if [ "$v" \< "$STRICT_FROM" ]; then
    errs=$(p -f "$f" 2>&1 | grep ERROR); [ -n "$errs" ] && echo "known-legacy: $(basename "$f"): $(echo "$errs" | head -1 | cut -c1-140)"
  else
    out=$(p -v ON_ERROR_STOP=1 -f "$f" 2>&1) || { echo "FAILED: $(basename "$f")"; echo "$out" | grep -v NOTICE; failed=1; continue; }
    echo "ok: $(basename "$f")"
  fi
done
echo "Connect for manual checks: psql -h 127.0.0.1 -p $PORT -U postgres -d eventloom"
exit $failed
