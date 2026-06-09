#!/usr/bin/env bash
# ---------------------------------------------------------------------
# Laravel container bootstrap
#   - Waits for MySQL
#   - Persists APP_KEY across image rebuilds via storage volume
#   - Runs migrations always, seeders once
#   - Rebuilds production caches every boot
# ---------------------------------------------------------------------
set -e

APP_ROOT=/var/www/backend
cd "$APP_ROOT"

log() { printf '\033[1;36m[entrypoint]\033[0m %s\n' "$*"; }

# Avoid an empty docker env var from clobbering .env's APP_KEY
if [ -z "${APP_KEY:-}" ]; then
    unset APP_KEY
fi

# Workers (queue / scheduler) skip bootstrap — only the app container migrates.
if [ "${SKIP_BOOTSTRAP:-0}" = "1" ]; then
    log "SKIP_BOOTSTRAP=1 — waiting for primary app to finish bootstrap ..."
    # Wait for seed-marker so workers don't race against migrations
    SEED_MARKER="$APP_ROOT/storage/.seeded"
    for i in $(seq 1 120); do
        if [ -f "$SEED_MARKER" ]; then
            log "Primary app bootstrap detected — starting worker."
            break
        fi
        sleep 2
    done
    exec "$@"
fi

# ---------------------------------------------------------------------
# 1. Wait for MySQL
# ---------------------------------------------------------------------
if [ -n "${DB_HOST:-}" ]; then
    log "Waiting for MySQL at ${DB_HOST}:${DB_PORT:-3306} ..."
    for i in $(seq 1 60); do
        # --skip-ssl: Alpine ships mariadb-client which insists on verifying
        # MySQL 8's auto-generated TLS cert by default — ping doesn't need TLS.
        if mysqladmin ping -h "$DB_HOST" -P "${DB_PORT:-3306}" \
              -u "${DB_USERNAME:-root}" -p"${DB_PASSWORD:-}" \
              --skip-ssl --silent 2>/dev/null; then
            log "MySQL is up."
            break
        fi
        sleep 2
        if [ "$i" -ge 60 ]; then
            log "MySQL never came up — aborting."
            exit 1
        fi
    done
fi

# ---------------------------------------------------------------------
# 2. APP_KEY — persisted in storage volume so rebuilds don't break sessions/encryption
# ---------------------------------------------------------------------
KEY_FILE="$APP_ROOT/storage/.app_key"
ensure_key_in_env() {
    local key="$1"
    if grep -qE '^APP_KEY=' .env 2>/dev/null; then
        # macOS-safe sed not needed — Alpine uses GNU
        sed -i "s|^APP_KEY=.*|APP_KEY=$key|" .env
    else
        printf 'APP_KEY=%s\n' "$key" >> .env
    fi
}

if [ -s "$KEY_FILE" ]; then
    STORED_KEY="$(cat "$KEY_FILE")"
    log "Restoring APP_KEY from persistent storage."
    ensure_key_in_env "$STORED_KEY"
else
    if ! grep -qE '^APP_KEY=base64:[A-Za-z0-9+/=]+$' .env 2>/dev/null; then
        log "Generating new APP_KEY ..."
        php artisan key:generate --force --no-interaction
    fi
    NEW_KEY="$(grep -E '^APP_KEY=' .env | head -1 | cut -d= -f2-)"
    if [ -n "$NEW_KEY" ]; then
        printf '%s' "$NEW_KEY" > "$KEY_FILE"
        log "APP_KEY persisted to $KEY_FILE"
    fi
fi

# ---------------------------------------------------------------------
# 3. Storage symlink (idempotent — won't fail if exists)
# ---------------------------------------------------------------------
log "Linking storage ..."
php artisan storage:link --force --no-interaction || true

# ---------------------------------------------------------------------
# 4. Migrations
# ---------------------------------------------------------------------
log "Running migrations ..."
php artisan migrate --force --no-interaction

# ---------------------------------------------------------------------
# 5. Seed once — guarded by marker
# ---------------------------------------------------------------------
SEED_MARKER="$APP_ROOT/storage/.seeded"
if [ ! -f "$SEED_MARKER" ]; then
    log "First boot — running database seeders ..."
    if php artisan db:seed --force --no-interaction; then
        touch "$SEED_MARKER"
        log "Seeders complete; marker written to $SEED_MARKER"
    else
        log "Seeders failed — leaving marker absent so they retry next boot."
        exit 1
    fi
else
    log "Seeders already ran (marker present) — skipping."
fi

# ---------------------------------------------------------------------
# 6. Production caches (rebuilt every boot so env changes propagate)
# ---------------------------------------------------------------------
log "Rebuilding production caches ..."
php artisan optimize:clear  >/dev/null 2>&1 || true
php artisan config:cache    --no-interaction
php artisan route:cache     --no-interaction 2>/dev/null || log "route:cache skipped (closure routes present)"
php artisan view:cache      --no-interaction
php artisan event:cache     --no-interaction || true

# ---------------------------------------------------------------------
# 7. Final perms sweep — volume mounts can reset ownership
# ---------------------------------------------------------------------
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true
chmod -R 775                  storage bootstrap/cache 2>/dev/null || true

log "Bootstrap complete — exec: $*"
exec "$@"
