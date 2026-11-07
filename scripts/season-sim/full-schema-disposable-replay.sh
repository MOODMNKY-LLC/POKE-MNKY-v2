#!/usr/bin/env bash
# Disposable full-schema replay for season-sim P0–P1 validation.
# Does NOT touch production/staging/shared projects.
#
# Prerequisites (local/CI VM only):
#   - Docker
#   - public.ecr.aws/supabase/postgres image (pin via SUPABASE_PG_IMAGE)
#   - public.ecr.aws/supabase/storage-api image (pin via STORAGE_API_IMAGE)
#
# Order (required):
#   1) Start fresh supabase/postgres
#   2) Apply official storage-api tenant migrations with storage.install_roles=false
#      and search_path=storage,public (roles already exist on the image)
#   3) Apply ALL repo supabase/migrations/*.sql in lexical order into an EMPTY
#      supabase_migrations.schema_migrations table
#   4) For Auth/signup tests: start GoTrue against this DB so it applies its own
#      auth schema migrations (email_confirmed_at). Bare postgres image auth.users
#      is stale until GoTrue migrates — that is a platform prerequisite, not an
#      app handle_new_user bug. Do NOT disable triggers to create fixture users.
#
# Honesty rules:
#   - Counts only freshly executed OK applications (no skip of recorded versions)
#   - Does not reorder/skip/stub repo migrations
#   - Exits non-zero on first failure
#
# Usage:
#   ./scripts/season-sim/full-schema-disposable-replay.sh
# Env:
#   SUPABASE_PG_IMAGE   default public.ecr.aws/supabase/postgres:17.11.0.006
#   STORAGE_API_IMAGE   default public.ecr.aws/supabase/storage-api:v1.88.0
#   CONTAINER_NAME      default season-sim-pg-replay
#   HOST_PG_PORT        default 65437 (127.0.0.1 only)
#   SB_PG_PASS          required disposable password (never commit/print)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SUPABASE_PG_IMAGE="${SUPABASE_PG_IMAGE:-public.ecr.aws/supabase/postgres:17.11.0.006}"
STORAGE_API_IMAGE="${STORAGE_API_IMAGE:-public.ecr.aws/supabase/storage-api:v1.88.0}"
CONTAINER_NAME="${CONTAINER_NAME:-season-sim-pg-replay}"
HOST_PG_PORT="${HOST_PG_PORT:-65437}"
NETWORK_NAME="${NETWORK_NAME:-season-sim-net}"
WORKDIR="${WORKDIR:-/tmp/season-sim-migrate-replay}"

if [[ -z "${SB_PG_PASS:-}" ]]; then
  echo "SB_PG_PASS must be set to a disposable local password (not printed)." >&2
  exit 2
fi
# Per-run signing material only — never use a committed/shared default secret.
if [[ -z "${JWT_SECRET:-}" ]]; then
  if ! command -v openssl >/dev/null 2>&1; then
    echo "JWT_SECRET unset and openssl missing; refuse fixed demo secret." >&2
    exit 2
  fi
  JWT_SECRET="$(openssl rand -hex 32)"
  export JWT_SECRET
fi
if [[ "${#JWT_SECRET}" -lt 32 ]]; then
  echo "JWT_SECRET must be at least 32 characters." >&2
  exit 2
fi

mkdir -p "$WORKDIR"
: >"$WORKDIR/storage.log"
: >"$WORKDIR/repo.log"
: >"$WORKDIR/summary.txt"

docker network create "$NETWORK_NAME" >/dev/null 2>&1 || true
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

STORAGE_SQL_HOST="$WORKDIR/storage-tenant"
rm -rf "$STORAGE_SQL_HOST"
TMP_STORAGE="season-sim-storage-extract-$$"
docker create --name "$TMP_STORAGE" "$STORAGE_API_IMAGE" >/dev/null
docker cp "$TMP_STORAGE:/app/migrations/tenant" "$STORAGE_SQL_HOST"
docker rm "$TMP_STORAGE" >/dev/null

docker run -d --name "$CONTAINER_NAME" --network "$NETWORK_NAME" \
  -e POSTGRES_PASSWORD="$SB_PG_PASS" \
  -e POSTGRES_HOST=/var/run/postgresql \
  -e JWT_SECRET="$JWT_SECRET" \
  -v "$ROOT/supabase/migrations:/migrations:ro" \
  -v "$STORAGE_SQL_HOST:/storage-migrations:ro" \
  -p "127.0.0.1:${HOST_PG_PORT}:5432" \
  "$SUPABASE_PG_IMAGE" \
  postgres -c config_file=/etc/postgresql/postgresql.conf >/dev/null

echo "Waiting for supabase/postgres init..."
for i in $(seq 1 90); do
  if docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U supabase_admin -d postgres \
    -tAc "SELECT 1 FROM pg_namespace WHERE nspname='storage'" 2>/dev/null | grep -q 1; then
    if docker exec "$CONTAINER_NAME" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then
      echo "READY attempt=$i"
      break
    fi
  fi
  if [[ "$i" -eq 90 ]]; then
    echo "Postgres failed to become ready" >&2
    exit 1
  fi
  sleep 1
done

mapfile -t SM < <(ls "$STORAGE_SQL_HOST"/*.sql | sort -V)
STORAGE_OK=0
for f in "${SM[@]}"; do
  base=$(basename "$f")
  err="$WORKDIR/storage_${base}.err"
  if docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
    -c "SELECT set_config('storage.install_roles', 'false', false); SET search_path TO storage, public;" \
    -f "/storage-migrations/$base" >"$err" 2>&1; then
    STORAGE_OK=$((STORAGE_OK + 1))
    echo "STORAGE_OK $base" >>"$WORKDIR/storage.log"
  else
    echo "STORAGE_FAIL $base" | tee -a "$WORKDIR/summary.txt"
    tail -40 "$err" >&2
    exit 1
  fi
done
echo "STORAGE_EXECUTED_OK=${STORAGE_OK}/${#SM[@]}" | tee -a "$WORKDIR/summary.txt"

OBJECTS=$(docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U supabase_admin -d postgres -tAc \
  "SELECT to_regclass('storage.objects') IS NOT NULL" | tr -d '[:space:]')
echo "STORAGE_OBJECTS=$OBJECTS" | tee -a "$WORKDIR/summary.txt"
if [[ "$OBJECTS" != "t" ]]; then
  echo "storage.objects missing after storage tenant migrations" >&2
  exit 1
fi

docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -c "
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
DROP TABLE IF EXISTS supabase_migrations.schema_migrations;
CREATE TABLE supabase_migrations.schema_migrations (
  version text PRIMARY KEY,
  statements text[],
  name text
);
"

mapfile -t FILES < <(ls "$ROOT"/supabase/migrations/*.sql | sort)
TOTAL=${#FILES[@]}
REPO_OK=0
for f in "${FILES[@]}"; do
  base=$(basename "$f")
  version="${base%%_*}"
  name="${base#*_}"
  name="${name%.sql}"
  err="$WORKDIR/repo_${version}.err"
  exists=$(docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U supabase_admin -d postgres -tAc \
    "SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='$version'" | tr -d '[:space:]')
  if [[ "$exists" == "1" ]]; then
    echo "UNEXPECTED_PREEXISTING $base" | tee -a "$WORKDIR/summary.txt"
    exit 1
  fi
  if docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
    -f "/migrations/$base" >"$err" 2>&1; then
    docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U supabase_admin -d postgres -c \
      "INSERT INTO supabase_migrations.schema_migrations(version, name) VALUES ('$version','$name');" >/dev/null
    REPO_OK=$((REPO_OK + 1))
    echo "REPO_OK $base" >>"$WORKDIR/repo.log"
  else
    echo "REPO_FAIL $base" | tee -a "$WORKDIR/summary.txt"
    tail -40 "$err" >&2
    exit 1
  fi
done

RECORDED=$(docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U supabase_admin -d postgres -tAc \
  "SELECT COUNT(*) FROM supabase_migrations.schema_migrations" | tr -d '[:space:]')
FEATURE=$(docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U supabase_admin -d postgres -tAc \
  "SELECT COUNT(*) FROM supabase_migrations.schema_migrations WHERE version IN ('20261106130021','20261106130022','20261106132402','20261107023900','20261107025000')" | tr -d '[:space:]')

{
  echo "ENGINE=$SUPABASE_PG_IMAGE"
  echo "STORAGE_API=$STORAGE_API_IMAGE"
  echo "REPO_EXECUTED_OK=${REPO_OK}/${TOTAL}"
  echo "RECORDED_VERSIONS=$RECORDED"
  echo "FEATURE_RECORDED=$FEATURE"
  echo "CONTAINER=$CONTAINER_NAME"
  echo "HOST_PORT=127.0.0.1:${HOST_PG_PORT}"
} | tee -a "$WORKDIR/summary.txt"

if [[ "$REPO_OK" != "$TOTAL" || "$RECORDED" != "$TOTAL" ]]; then
  echo "Mismatch between executed OK and recorded versions" >&2
  exit 1
fi

echo "CLEAN_REPLAY_OK"
