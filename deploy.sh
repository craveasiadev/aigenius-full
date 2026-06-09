#!/usr/bin/env bash
# =====================================================================
#  Aigenius-Full — one-script deploy / ops tool
# ---------------------------------------------------------------------
#  Run on the VPS:        ./deploy.sh --update
#  First-time bootstrap:  ./deploy.sh --init
#  Quick status:          ./deploy.sh --status
#  Tail logs:             ./deploy.sh --logs [service]
#  Show help:             ./deploy.sh --help
#
#  The script is idempotent and safe to re-run. Destructive flags
#  (--fresh, --nuke) prompt for confirmation unless --yes is passed.
# =====================================================================
set -Eeuo pipefail

# ---- locate ourselves --------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ---- pretty output -----------------------------------------------------
ESC=$'\033'
BOLD="${ESC}[1m"; DIM="${ESC}[2m"
RED="${ESC}[1;31m"; GREEN="${ESC}[1;32m"
YELLOW="${ESC}[1;33m"; CYAN="${ESC}[1;36m"; RESET="${ESC}[0m"

log()   { printf '%s==>%s %s\n'  "$CYAN"   "$RESET" "$*"; }
ok()    { printf '%s OK%s %s\n'  "$GREEN"  "$RESET" "$*"; }
warn()  { printf '%s !!%s %s\n'  "$YELLOW" "$RESET" "$*" >&2; }
die()   { printf '%s xx%s %s\n'  "$RED"    "$RESET" "$*" >&2; exit 1; }
step()  { printf '\n%s── %s ──%s\n' "$BOLD" "$*" "$RESET"; }

# ---- compose binary detect --------------------------------------------
if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
else
    die "docker compose (v2) or docker-compose (v1) is required"
fi

# ---- flags / state ----------------------------------------------------
DO_INIT=0
DO_UPDATE=0
DO_BUILD=0
DO_PULL=0
DO_START=0
DO_RESTART=0
DO_DOWN=0
DO_FRESH=0
DO_NUKE=0
DO_MIGRATE=0
DO_SEED=0
DO_STATUS=0
DO_CACHE=0
DO_LOGS=0
LOG_SERVICE=""
ONLY_SERVICE=""
ASSUME_YES=0
NO_BUILD=0

usage() {
    cat <<'USAGE'
Aigenius-Full deploy.sh — operations runner

USAGE:
    ./deploy.sh [FLAGS]

LIFECYCLE (one of these is usually what you want):
    --init              First-time deploy: build images + start everything.
                        Bootstraps DB (migrate + seed) on first boot.
    --update            Git pull (if repo) + rebuild changed images +
                        recreate containers. Preserves data volumes.
                        This is the everyday "ship it" command.
    --restart           Restart containers without rebuilding (fastest).
    --down              Stop containers (data preserved).
    --pull              Just git pull, no rebuild.
    --build             Rebuild images. Combine with --only=<svc> to
                        rebuild a single service (e.g. --build --only=web).

OPERATIONAL:
    --status            Show running container status + healthchecks.
    --logs [svc]        Tail logs. Optional service name (app|web|queue|...).
    --migrate           Run `php artisan migrate --force`.
    --seed              Re-run database seeders (resets the seed marker).
    --cache             Rebuild Laravel config/route/view caches.

TARGETING:
    --only=SERVICE      Limit --build / --restart to one service.
                        e.g. ./deploy.sh --update --only=web
    --no-build          Skip image rebuild when used with --update
                        (containers recreated from existing images).

DESTRUCTIVE (require --yes or interactive confirm):
    --fresh             Drop DB tables, re-migrate, re-seed.
                        Keeps Docker images + uploaded files in app_storage.
    --nuke              Stop + remove EVERYTHING incl. volumes
                        (database, uploaded files, all data). Irreversible.

MISC:
    --yes               Skip confirmation prompts.
    --help              Show this message.

EXAMPLES:
    ./deploy.sh --init                    # first deploy
    ./deploy.sh --update                  # daily redeploy after git pull
    ./deploy.sh --update --only=web       # rebuild just the frontend
    ./deploy.sh --logs app                # tail Laravel logs
    ./deploy.sh --fresh --yes             # wipe DB + reseed (CI / staging only!)

USAGE
}

# ---- parse flags ------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --init)     DO_INIT=1 ;;
        --update)   DO_UPDATE=1 ;;
        --build)    DO_BUILD=1 ;;
        --pull)     DO_PULL=1 ;;
        --start)    DO_START=1 ;;
        --restart)  DO_RESTART=1 ;;
        --down)     DO_DOWN=1 ;;
        --fresh)    DO_FRESH=1 ;;
        --nuke)     DO_NUKE=1 ;;
        --migrate)  DO_MIGRATE=1 ;;
        --seed)     DO_SEED=1 ;;
        --cache)    DO_CACHE=1 ;;
        --status)   DO_STATUS=1 ;;
        --logs)     DO_LOGS=1; LOG_SERVICE="${2:-}"; [[ -n "$LOG_SERVICE" && "$LOG_SERVICE" != --* ]] && shift ;;
        --only=*)   ONLY_SERVICE="${1#*=}" ;;
        --only)     ONLY_SERVICE="${2:-}"; shift ;;
        --no-build) NO_BUILD=1 ;;
        --yes|-y)   ASSUME_YES=1 ;;
        --help|-h)  usage; exit 0 ;;
        *)          die "Unknown flag: $1   (try --help)" ;;
    esac
    shift || true
done

# default action: --status
if (( DO_INIT + DO_UPDATE + DO_BUILD + DO_PULL + DO_START + DO_RESTART + \
      DO_DOWN + DO_FRESH + DO_NUKE + DO_MIGRATE + DO_SEED + DO_CACHE + \
      DO_STATUS + DO_LOGS == 0 )); then
    log "No action specified — showing status (use --help for options)."
    DO_STATUS=1
fi

# ---- preflight --------------------------------------------------------
preflight() {
    step "Preflight"
    [[ -f docker-compose.yml ]] || die "docker-compose.yml not found in $SCRIPT_DIR"
    [[ -f .env ]] || {
        if [[ -f .env.example ]]; then
            warn ".env missing — copying .env.example. Edit it before going live."
            cp .env.example .env
        else
            die ".env not found and no .env.example to seed it."
        fi
    }
    docker info >/dev/null 2>&1 || die "Docker daemon not reachable."
    ok "Preflight passed."
}

# ---- helpers ----------------------------------------------------------
confirm() {
    (( ASSUME_YES )) && return 0
    local prompt="$1"
    read -rp "$prompt [y/N] " ans
    [[ "$ans" =~ ^[Yy]$ ]]
}

git_pull() {
    if [[ -d .git ]]; then
        step "git pull"
        local before; before=$(git rev-parse HEAD)
        git pull --ff-only || die "git pull failed (resolve manually then retry)"
        local after; after=$(git rev-parse HEAD)
        if [[ "$before" == "$after" ]]; then
            ok "Already up to date."
        else
            ok "Pulled: $before -> $after"
        fi
    else
        log "Not a git repo — skipping pull."
    fi
}

do_build() {
    step "Build images${ONLY_SERVICE:+ ($ONLY_SERVICE only)}"
    if [[ -n "$ONLY_SERVICE" ]]; then
        "${COMPOSE[@]}" build --pull "$ONLY_SERVICE"
    else
        "${COMPOSE[@]}" build --pull
    fi
    ok "Images built."
}

do_up() {
    step "Start stack${ONLY_SERVICE:+ ($ONLY_SERVICE only)}"
    if [[ -n "$ONLY_SERVICE" ]]; then
        "${COMPOSE[@]}" up -d --no-deps "$ONLY_SERVICE"
    else
        "${COMPOSE[@]}" up -d
    fi
    ok "Containers up."
}

wait_healthy() {
    step "Wait for app healthcheck"
    local tries=0 max=60
    while (( tries < max )); do
        local state; state=$("${COMPOSE[@]}" ps --format json app 2>/dev/null | grep -oE '"Health":"[^"]*"' | head -1 || true)
        if [[ "$state" == *"healthy"* ]]; then
            ok "App container is healthy."
            return 0
        fi
        sleep 2; (( tries++ )) || true
        (( tries % 5 == 0 )) && log "  …still waiting ($((tries*2))s)"
    done
    warn "App didn't become healthy in $((max*2))s — run './deploy.sh --logs app' to inspect."
}

# ---- actions ----------------------------------------------------------
action_status() {
    step "Container status"
    "${COMPOSE[@]}" ps
    echo
    local port; port=$(grep -E '^HTTP_PORT=' .env 2>/dev/null | cut -d= -f2 || echo 80)
    local bind; bind=$(grep -E '^HTTP_BIND=' .env 2>/dev/null | cut -d= -f2 || echo 0.0.0.0)
    log "Reachable on http://${bind}:${port}"
}

action_logs() {
    step "Tail logs${LOG_SERVICE:+ ($LOG_SERVICE)}"
    if [[ -n "$LOG_SERVICE" ]]; then
        "${COMPOSE[@]}" logs -f --tail=200 "$LOG_SERVICE"
    else
        "${COMPOSE[@]}" logs -f --tail=200
    fi
}

action_migrate() {
    step "Run migrations"
    "${COMPOSE[@]}" exec -T app php artisan migrate --force --no-interaction
    ok "Migrations done."
}

action_seed() {
    step "Re-seed database"
    if confirm "This will re-run ALL seeders (will create duplicates if seeders aren't idempotent). Continue?"; then
        "${COMPOSE[@]}" exec -T app rm -f /var/www/backend/storage/.seeded
        "${COMPOSE[@]}" exec -T app php artisan db:seed --force --no-interaction
        "${COMPOSE[@]}" exec -T app touch /var/www/backend/storage/.seeded
        ok "Seeders done."
    else
        log "Cancelled."
    fi
}

action_cache() {
    step "Rebuild Laravel caches"
    "${COMPOSE[@]}" exec -T app php artisan optimize:clear
    "${COMPOSE[@]}" exec -T app php artisan config:cache
    "${COMPOSE[@]}" exec -T app php artisan route:cache || warn "route:cache skipped (closure routes)"
    "${COMPOSE[@]}" exec -T app php artisan view:cache
    "${COMPOSE[@]}" exec -T app php artisan event:cache || true
    ok "Caches rebuilt."
}

action_fresh() {
    step "Fresh database"
    if ! confirm "This will DROP all tables and reseed. ALL APPLICATION DATA WILL BE LOST. Continue?"; then
        log "Cancelled."; return
    fi
    "${COMPOSE[@]}" exec -T app php artisan migrate:fresh --seed --force --no-interaction
    "${COMPOSE[@]}" exec -T app touch /var/www/backend/storage/.seeded
    ok "Fresh DB ready."
}

action_nuke() {
    step "NUKE — containers + volumes"
    if ! confirm "This will DESTROY containers AND all volumes (db, redis, uploaded files). Continue?"; then
        log "Cancelled."; return
    fi
    "${COMPOSE[@]}" down -v
    ok "All gone."
}

# ---- orchestration ----------------------------------------------------
preflight

if (( DO_NUKE ));    then action_nuke;    exit 0; fi
if (( DO_DOWN ));    then step "docker compose down"; "${COMPOSE[@]}" down; ok "Stopped."; exit 0; fi
if (( DO_STATUS ));  then action_status; exit 0; fi
if (( DO_LOGS ));    then action_logs;   exit 0; fi
if (( DO_PULL ));    then git_pull;       exit 0; fi
if (( DO_CACHE ));   then action_cache;   exit 0; fi
if (( DO_MIGRATE )); then action_migrate; exit 0; fi
if (( DO_SEED ));    then action_seed;    exit 0; fi
if (( DO_FRESH ));   then action_fresh;   exit 0; fi

if (( DO_INIT )); then
    do_build
    do_up
    wait_healthy
    action_status
    ok "Initial deploy complete."
    exit 0
fi

if (( DO_UPDATE )); then
    git_pull
    (( NO_BUILD )) || do_build
    do_up
    wait_healthy
    action_status
    ok "Update complete."
    exit 0
fi

if (( DO_BUILD ));   then do_build;   ok "Done."; exit 0; fi
if (( DO_START ));   then do_up;      wait_healthy; action_status; exit 0; fi
if (( DO_RESTART )); then
    step "Restart${ONLY_SERVICE:+ ($ONLY_SERVICE only)}"
    if [[ -n "$ONLY_SERVICE" ]]; then
        "${COMPOSE[@]}" restart "$ONLY_SERVICE"
    else
        "${COMPOSE[@]}" restart
    fi
    ok "Restarted."
    exit 0
fi
