#!/usr/bin/env bash
# Bring up disposable Postgres(Storage+repo migrations)+GoTrue+PostgREST+gateway+Next
# and run scripts/season-sim/real-server-auth-e2e.ts.
#
# Fail-closed: missing Docker/images/env/health → non-zero. Never skips assertions.
# Loopback-only listeners. Disposable credentials generated at runtime (not committed).
#
# Usage:
#   ./scripts/season-sim/bring-up-real-server-stack.sh
# Env overrides (optional):
#   SUPABASE_PG_IMAGE STORAGE_API_IMAGE GOTRUE_IMAGE POSTGREST_IMAGE
#   HOST_PG_PORT GOTRUE_PORT REST_PORT GATEWAY_PORT APP_PORT
#   SKIP_CLEAN_REPLAY=1  # reuse existing season-sim-pg-clean (local debug only)
#   KEEP_STACK=1         # leave containers running after tests

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

SUPABASE_PG_IMAGE="${SUPABASE_PG_IMAGE:-public.ecr.aws/supabase/postgres:17.11.0.006}"
STORAGE_API_IMAGE="${STORAGE_API_IMAGE:-public.ecr.aws/supabase/storage-api:v1.88.0}"
GOTRUE_IMAGE="${GOTRUE_IMAGE:-public.ecr.aws/supabase/gotrue:v2.197.0}"
POSTGREST_IMAGE="${POSTGREST_IMAGE:-public.ecr.aws/supabase/postgrest:v16.5}"

HOST_PG_PORT="${HOST_PG_PORT:-65437}"
GOTRUE_PORT="${GOTRUE_PORT:-9999}"
REST_PORT="${REST_PORT:-65433}"
GATEWAY_PORT="${GATEWAY_PORT:-54321}"
APP_PORT="${APP_PORT:-3010}"

PG_CONTAINER="${PG_CONTAINER:-season-sim-pg-auth}"
GOTRUE_CONTAINER="${GOTRUE_CONTAINER:-season-sim-gotrue-auth}"
REST_CONTAINER="${REST_CONTAINER:-season-sim-rest-auth}"
NETWORK_NAME="${NETWORK_NAME:-season-sim-auth-net}"
WORKDIR="${WORKDIR:-/tmp/season-sim-auth-ci}"
STATE_DIR="$WORKDIR/state"
mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR"

# Well-known local Supabase demo JWT secret (public demo; not a production secret).
JWT_SECRET="${JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters-long}"
# Short access-token TTL so expiry cases finish without unbounded waits.
GOTRUE_JWT_EXP="${GOTRUE_JWT_EXP:-5}"

fail() { echo "FATAL: $*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "required command missing: $1"
}

require_cmd docker
require_cmd node
require_cmd pnpm
require_cmd curl
require_cmd python3
require_cmd openssl

if ! docker info >/dev/null 2>&1; then
  fail "docker daemon not available"
fi

# Runtime-only disposable password (never echoed).
SB_PG_PASS="$(openssl rand -hex 16)"
ADMIN_PASSWORD="$(openssl rand -hex 12)Aa1!"
NONADMIN_PASSWORD="$(openssl rand -hex 12)Bb2!"
WORKER_KEY="local-disposable-sim-worker-$(openssl rand -hex 8)"

# Public local demo anon/service JWTs matching JWT_SECRET (same as supabase start defaults).
ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
SERVICE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

GATEWAY_URL="http://127.0.0.1:${GATEWAY_PORT}"
APP_URL="http://127.0.0.1:${APP_PORT}"

cleanup() {
  local ec=$?
  set +e
  if [[ -n "${NEXT_PID:-}" ]]; then kill "$NEXT_PID" 2>/dev/null; wait "$NEXT_PID" 2>/dev/null; fi
  if [[ -n "${GATEWAY_PID:-}" ]]; then kill "$GATEWAY_PID" 2>/dev/null; wait "$GATEWAY_PID" 2>/dev/null; fi
  if [[ "${KEEP_STACK:-0}" != "1" ]]; then
    docker rm -f "$GOTRUE_CONTAINER" "$REST_CONTAINER" "$PG_CONTAINER" >/dev/null 2>&1
    docker network rm "$NETWORK_NAME" >/dev/null 2>&1
  fi
  # Scrub runtime password files
  rm -f "$STATE_DIR"/gotrue.env "$STATE_DIR"/postgrest.env "$STATE_DIR"/passwords.env
  exit "$ec"
}
trap cleanup EXIT

wait_http() {
  local url="$1" label="$2" attempts="${3:-60}"
  local i
  for i in $(seq 1 "$attempts"); do
    if curl -fsS -o /dev/null "$url" 2>/dev/null; then
      echo "READY $label attempt=$i"
      return 0
    fi
    sleep 1
  done
  fail "$label not ready: $url"
}

echo "=== season-sim real-server stack bring-up ==="
echo "PG_IMAGE=$SUPABASE_PG_IMAGE"
echo "GOTRUE_IMAGE=$GOTRUE_IMAGE"
echo "POSTGREST_IMAGE=$POSTGREST_IMAGE"
echo "STORAGE_API=$STORAGE_API_IMAGE"
echo "JWT_EXP=${GOTRUE_JWT_EXP}s (short TTL for expiry cases)"

docker network create "$NETWORK_NAME" >/dev/null 2>&1 || true

# Free loopback ports from prior local runs (disposable names only).
docker rm -f season-sim-pg-clean season-sim-pg-replay season-sim-pg season-sim-gotrue \
  season-sim-rest season-sim-gotrue-auth season-sim-rest-auth "$PG_CONTAINER" \
  "$GOTRUE_CONTAINER" "$REST_CONTAINER" >/dev/null 2>&1 || true
pkill -f "season-sim-gateway-proxy" 2>/dev/null || true
pkill -f "scripts/season-sim/gateway-proxy.mjs" 2>/dev/null || true
# Best-effort stop leftover next on APP_PORT
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${APP_PORT}/tcp" 2>/dev/null || true
fi

if [[ "${SKIP_CLEAN_REPLAY:-0}" == "1" ]]; then
  echo "SKIP_CLEAN_REPLAY=1 — expecting existing DB on 127.0.0.1:${HOST_PG_PORT}"
  export SB_PG_PASS
  # Password must already match the running container.
else
  export SB_PG_PASS
  export SUPABASE_PG_IMAGE STORAGE_API_IMAGE
  export CONTAINER_NAME="$PG_CONTAINER"
  export HOST_PG_PORT NETWORK_NAME
  export WORKDIR="$WORKDIR/migrate"
  mkdir -p "$WORKDIR"
  echo "=== clean schema replay (Storage + all repo migrations) ==="
  "$ROOT/scripts/season-sim/full-schema-disposable-replay.sh" | tee "$STATE_DIR/replay.summary"
  grep -q 'CLEAN_REPLAY_OK' "$STATE_DIR/replay.summary" || fail "clean replay did not report CLEAN_REPLAY_OK"
  REPO_LINE="$(grep '^REPO_EXECUTED_OK=' "$STATE_DIR/replay.summary" || true)"
  echo "RECORDED $REPO_LINE"
fi

echo "=== role passwords + grants ==="
docker exec "$PG_CONTAINER" psql -h 127.0.0.1 -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -c \
  "ALTER ROLE supabase_auth_admin WITH PASSWORD '$SB_PG_PASS'; ALTER ROLE authenticator WITH PASSWORD '$SB_PG_PASS';" >/dev/null
docker exec "$PG_CONTAINER" psql -h 127.0.0.1 -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -c \
  "GRANT EXECUTE ON FUNCTION public.sim_claim_run_lease(uuid, text, integer) TO service_role;
   GRANT EXECUTE ON FUNCTION public.sim_apply_foundation_step(uuid, uuid, text, text, uuid, jsonb, text) TO service_role;
   GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;" >/dev/null

# Confirm triggers/RLS still enabled (fail if disabled)
TRIGGERS_ON="$(docker exec "$PG_CONTAINER" psql -h 127.0.0.1 -U supabase_admin -d postgres -tAc \
  "SELECT COUNT(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='auth' AND c.relname='users' AND NOT t.tgisinternal AND t.tgenabled <> 'D';" | tr -d '[:space:]')"
[[ "${TRIGGERS_ON}" -ge 1 ]] || fail "auth.users triggers appear disabled"
RLS_ON="$(docker exec "$PG_CONTAINER" psql -h 127.0.0.1 -U supabase_admin -d postgres -tAc \
  "SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='simulation_runs';" | tr -d '[:space:]')"
[[ "$RLS_ON" == "t" ]] || fail "simulation_runs RLS is not enabled"

echo "TRIGGERS_ACTIVE_ON_AUTH_USERS=$TRIGGERS_ON"
echo "SIMULATION_RUNS_RLS=$RLS_ON"

echo "=== GoTrue (${GOTRUE_JWT_EXP}s JWT exp) ==="
docker rm -f "$GOTRUE_CONTAINER" >/dev/null 2>&1 || true
umask 077
cat >"$STATE_DIR/gotrue.env" <<EOF
GOTRUE_API_HOST=127.0.0.1
GOTRUE_API_PORT=${GOTRUE_PORT}
API_EXTERNAL_URL=http://127.0.0.1:${GOTRUE_PORT}
GOTRUE_DB_DRIVER=postgres
GOTRUE_DB_DATABASE_URL=postgres://supabase_auth_admin:${SB_PG_PASS}@127.0.0.1:${HOST_PG_PORT}/postgres
GOTRUE_SITE_URL=${APP_URL}
GOTRUE_URI_ALLOW_LIST=${APP_URL},${APP_URL}/**
GOTRUE_DISABLE_SIGNUP=false
GOTRUE_JWT_ADMIN_ROLES=service_role
GOTRUE_JWT_AUD=authenticated
GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated
GOTRUE_JWT_EXP=${GOTRUE_JWT_EXP}
GOTRUE_JWT_SECRET=${JWT_SECRET}
GOTRUE_EXTERNAL_EMAIL_ENABLED=true
GOTRUE_MAILER_AUTOCONFIRM=true
GOTRUE_SMTP_MAX_FREQUENCY=1s
GOTRUE_RATE_LIMIT_HEADER=X-Forwarded-For
GOTRUE_API_REQUEST_TIMEOUT=10s
EOF
docker run -d --name "$GOTRUE_CONTAINER" --network host \
  --env-file "$STATE_DIR/gotrue.env" \
  "$GOTRUE_IMAGE" >/dev/null
wait_http "http://127.0.0.1:${GOTRUE_PORT}/health" "gotrue" 45

# Confirm GoTrue migrated email_confirmed_at
COL="$(docker exec "$PG_CONTAINER" psql -h 127.0.0.1 -U supabase_admin -d postgres -tAc \
  "SELECT 1 FROM information_schema.columns WHERE table_schema='auth' AND table_name='users' AND column_name='email_confirmed_at';" | tr -d '[:space:]')"
[[ "$COL" == "1" ]] || fail "GoTrue did not create auth.users.email_confirmed_at"

echo "=== PostgREST ==="
docker rm -f "$REST_CONTAINER" >/dev/null 2>&1 || true
cat >"$STATE_DIR/postgrest.env" <<EOF
PGRST_DB_URI=postgres://authenticator:${SB_PG_PASS}@127.0.0.1:${HOST_PG_PORT}/postgres
PGRST_DB_SCHEMAS=public,storage,graphql_public
PGRST_DB_ANON_ROLE=anon
PGRST_JWT_SECRET=${JWT_SECRET}
PGRST_DB_EXTRA_SEARCH_PATH=public,extensions
PGRST_SERVER_PORT=${REST_PORT}
PGRST_SERVER_HOST=127.0.0.1
EOF
docker run -d --name "$REST_CONTAINER" --network host \
  --env-file "$STATE_DIR/postgrest.env" \
  "$POSTGREST_IMAGE" >/dev/null
sleep 2
curl -fsS -o /dev/null "http://127.0.0.1:${REST_PORT}/" || fail "PostgREST not responding"

echo "=== gateway proxy ==="
pkill -f "scripts/season-sim/gateway-proxy.mjs" 2>/dev/null || true
SEASON_SIM_AUTH_UPSTREAM="http://127.0.0.1:${GOTRUE_PORT}" \
SEASON_SIM_REST_UPSTREAM="http://127.0.0.1:${REST_PORT}" \
SEASON_SIM_GATEWAY_PORT="${GATEWAY_PORT}" \
  node "$ROOT/scripts/season-sim/gateway-proxy.mjs" >"$STATE_DIR/gateway.log" 2>&1 &
GATEWAY_PID=$!
wait_http "${GATEWAY_URL}/health" "gateway" 20

echo "=== signup fixtures (triggers ON; first user → profiles.role=admin) ==="
signup() {
  local email="$1" password="$2" data_json="$3" out="$4"
  local code
  code=$(curl -sS -o "$out" -w '%{http_code}' \
    -H "apikey: ${ANON_KEY}" -H "Authorization: Bearer ${ANON_KEY}" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\",\"data\":${data_json}}" \
    "${GATEWAY_URL}/auth/v1/signup")
  [[ "$code" == "200" ]] || fail "signup failed for ${email} status=${code}"
  python3 - "$out" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
u=d.get("user") or {}
if not u.get("id"):
  raise SystemExit("signup response missing user.id")
print("signup_ok user_prefix="+u["id"][:8])
PY
}

signup "season-sim-admin@example.invalid" "$ADMIN_PASSWORD" \
  '{"full_name":"Sim Admin Fixture"}' "$STATE_DIR/signup-admin.json"
signup "season-sim-coach@example.invalid" "$NONADMIN_PASSWORD" \
  '{"full_name":"Sim Coach Fixture","role":"admin"}' "$STATE_DIR/signup-nonadmin.json"

# Verify authorization source: profiles.role (not user_metadata)
docker exec "$PG_CONTAINER" psql -h 127.0.0.1 -U supabase_admin -d postgres -tAc \
  "SELECT u.email||'='||p.role FROM profiles p JOIN auth.users u ON u.id=p.id ORDER BY u.email;" \
  | tee "$STATE_DIR/profile-roles.txt"
grep -q 'season-sim-admin@example.invalid=admin' "$STATE_DIR/profile-roles.txt" \
  || fail "admin fixture profiles.role is not admin"
grep -q 'season-sim-coach@example.invalid=spectator' "$STATE_DIR/profile-roles.txt" \
  || fail "nonadmin fixture profiles.role is not spectator (user_metadata.role must not elevate)"

echo "=== next build + start (flags ON for suite) ==="
export NEXT_PUBLIC_SUPABASE_URL="$GATEWAY_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY"
# Build must see NEXT_PUBLIC_* 
pnpm build >"$STATE_DIR/next-build.log" 2>&1 || {
  tail -40 "$STATE_DIR/next-build.log" >&2
  fail "next build failed"
}

SIM_SANDBOX_V2=true \
SIM_WORKER_TICK_ENABLED=true \
SIMULATION_WORKER_KEY="$WORKER_KEY" \
NEXT_PUBLIC_SUPABASE_URL="$GATEWAY_URL" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY" \
SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY" \
  pnpm exec next start -H 127.0.0.1 -p "$APP_PORT" >"$STATE_DIR/next.log" 2>&1 &
NEXT_PID=$!
wait_http "$APP_URL/" "next" 60

echo "=== real-server auth e2e ==="
export APP_BASE_URL="$APP_URL"
export NEXT_PUBLIC_SUPABASE_URL="$GATEWAY_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY"
export SEASON_SIM_ADMIN_EMAIL="season-sim-admin@example.invalid"
export SEASON_SIM_ADMIN_PASSWORD="$ADMIN_PASSWORD"
export SEASON_SIM_NONADMIN_EMAIL="season-sim-coach@example.invalid"
export SEASON_SIM_NONADMIN_PASSWORD="$NONADMIN_PASSWORD"
export SIMULATION_WORKER_KEY="$WORKER_KEY"
export GOTRUE_JWT_EXP

pnpm test:season-sim-real-server | tee "$STATE_DIR/e2e.log"
echo "REAL_SERVER_AUTH_E2E_OK"
