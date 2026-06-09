# Aigenius-Full — Combined Docker Deployment

Single-VPS deployment for the Aigenius platform. Bundles:

| Component | Source | Branch | Tech |
|-----------|--------|--------|------|
| Frontend  | `wp-aigenius`  | `mobile` | React + Vite + Capacitor |
| Backend   | `artventure`   | `prod`   | Laravel 12 + PHP 8.3-FPM |

One `docker compose up` builds the React SPA, installs Composer deps,
boots MySQL + Redis, runs migrations + seeders, warms Laravel caches,
and starts the queue worker + scheduler — all behind a tuned nginx
front-end.

---

## TL;DR

```bash
# 1. Edit secrets if you need to (already pre-populated from existing project)
cp .env.example .env   # or just edit .env

# 2. Build + start everything
docker compose up -d --build

# 3. Watch the bootstrap (migrations + seed runs in the `app` container)
docker compose logs -f app

# 4. Open in browser
open http://localhost
```

First boot takes ~3–5 min (Composer install + npm build + migrations
+ seeders). Subsequent boots: ~15 s.

---

## Architecture

```
                ┌─────────────────────────────────────────────┐
HTTP :80  ───►  │  web (nginx 1.27 alpine)                    │
                │  ├── /              → React SPA (built)     │
                │  ├── /api/*         → strip → Laravel       │
                │  ├── /storage/*     → app_storage volume    │
                │  ├── /aipreneur/*   → Laravel               │
                │  └── *.php          → fastcgi_pass app:9000 │
                └────────────────┬────────────────────────────┘
                                 │
                ┌────────────────▼────────────────────────────┐
                │  app  (PHP-FPM 8.3 alpine, opcache+jit)     │
                │  - artisan migrate / db:seed on first boot  │
                │  - config / route / view cache              │
                └─┬───────────────┬──────────────────────────┬┘
                  │               │                          │
        ┌─────────▼──┐  ┌─────────▼─────────┐    ┌───────────▼──────────┐
        │  mysql 8   │  │ redis 7           │    │ queue + scheduler    │
        │  (volume)  │  │ cache / queue /   │    │ same image as app,   │
        │            │  │ sessions          │    │ SKIP_BOOTSTRAP=1     │
        └────────────┘  └───────────────────┘    └──────────────────────┘
```

### Why this layout?

* **Single origin** — frontend hits `/api/*` on the same host; nginx
  strips the prefix and forwards to Laravel. No CORS pain.
* **PHP-FPM + opcache + JIT** — `opcache.validate_timestamps=0` and a
  256MB opcode cache → 3-5x faster than php-cli serve.
* **nginx serves `/storage/` directly** via the shared volume (no PHP
  hop for uploaded files / shop images).
* **Workers reuse the app image** — one build, three roles
  (web-tier, queue worker, scheduler). Each gets `SKIP_BOOTSTRAP=1`
  and waits for the primary app's seed marker.
* **APP_KEY persists** across rebuilds via a marker file in
  `app_storage` — no broken sessions / encrypted data after `compose build`.

---

## Repo Layout

```
aigenius-full/
├── backend/           # Laravel app (artventure @ prod)
├── frontend/          # React app (wp-aigenius @ mobile)
├── docker/
│   ├── php/
│   │   ├── Dockerfile        # multi-stage: composer → php-fpm
│   │   ├── entrypoint.sh     # waits for mysql, migrates, seeds, caches
│   │   ├── php.ini           # memory_limit, realpath cache
│   │   ├── opcache.ini       # JIT enabled, validate_timestamps=0
│   │   └── www.conf          # FPM pool tuned for medium VPS
│   └── nginx/
│       ├── Dockerfile        # multi-stage: vite build → nginx alpine
│       ├── nginx.conf        # gzip, open_file_cache, worker tuning
│       └── site.conf         # single-origin routing
├── docker-compose.yml
├── .env                # pre-filled with project secrets
├── .env.example        # template
├── .dockerignore
└── Makefile            # `make up`, `make logs`, `make shell-app`, …
```

---

## First-time deployment

### Prerequisites

* Docker 24+ with Compose plugin
* 2 GB RAM minimum (4 GB recommended for npm build)
* Port 80 free (override `HTTP_PORT` in `.env` if not)

### Steps

```bash
# 1. Tune .env if needed (DB passwords, MAIL_FROM, APP_URL, etc.)
nano .env

# 2. Build + boot
docker compose up -d --build

# 3. Tail logs to watch migrations/seeders complete
docker compose logs -f app

# 4. Verify
curl http://localhost/healthz       # → "ok"
curl http://localhost/api/          # → Laravel JSON
open  http://localhost              # → React SPA
```

### What happens on first boot

`docker/php/entrypoint.sh` is the source of truth for the bootstrap
sequence. In order:

1. **Wait** for MySQL to be reachable (up to 2 minutes).
2. **APP_KEY** — restored from `storage/.app_key` if present,
   otherwise generated with `artisan key:generate` and persisted.
3. **`artisan storage:link`** — public symlink.
4. **`artisan migrate --force`** — 77 migrations from the prod branch.
5. **`artisan db:seed --force`** — only if `storage/.seeded` is absent.
6. **`artisan config:cache route:cache view:cache event:cache`**.
7. Permissions sweep on `storage/` and `bootstrap/cache/`.
8. `exec php-fpm`.

The `queue` and `scheduler` containers run the same image with
`SKIP_BOOTSTRAP=1`, so they wait until the seed marker exists before
starting their workers (no race against migrations).

---

## Daily ops

| Action | Command |
|--------|---------|
| Tail logs | `make logs` or `docker compose logs -f app` |
| Open Laravel shell | `make shell-app` |
| Run an artisan command | `docker compose exec app php artisan <cmd>` |
| Run a single migration | `make migrate` |
| Re-run seeders | `make seed` |
| **Destroy DB + start clean** | `make fresh` |
| Stop everything | `make stop` |
| Stop + remove containers (keeps data) | `make down` |
| **Nuke EVERYTHING (containers + volumes)** | `make nuke` |

---

## Updating to latest source

```bash
# In the original wp-aigenius (mobile) / artventure (prod) repos:
git pull

# Then in aigenius-full/, refresh the source dirs and rebuild
rsync -a --delete --exclude='node_modules' --exclude='vendor' \
      --exclude='dist' --exclude='android' \
      ../wp-aigenius/   frontend/
rsync -a --delete --exclude='node_modules' --exclude='vendor' \
      --exclude='storage/logs/*' \
      ../artventure/    backend/

docker compose build
docker compose up -d
```

Migrations + cache rebuilds happen automatically on the next boot.

---

## Performance notes

The stack is tuned for a medium VPS (4 vCPU, 4–8 GB RAM).

* **PHP-FPM**: `pm=dynamic`, 6 starting workers, max 40, recycle at 500
  requests. Adjust in `docker/php/www.conf`.
* **Opcache**: 256 MB shared memory, JIT tracing mode, comments
  preserved (Laravel attributes need them).
* **MySQL InnoDB**: 512 MB buffer pool, `flush_log_at_trx_commit=2`
  for ~2x write throughput (durability traded down by ≤1 s).
* **Redis**: 256 MB cap, LRU eviction — safe to lose cache, sessions
  are sticky via `SESSION_DRIVER=redis`.
* **Nginx**: open-file-cache enabled, gzip on all text MIME types,
  long-cache + immutable on `/assets/*` (Vite content hashes mean we
  never invalidate the wrong file).

Scale beyond a single VPS by replacing Redis + MySQL with managed
services and adding more `web`/`app` replicas — the design is
stateless apart from the two named volumes.

---

## Troubleshooting

### Migrations failed — fix DB then retry

```bash
docker compose exec app php artisan migrate --force
```

### Seeders should re-run

```bash
docker compose exec app rm -f /var/www/backend/storage/.seeded
docker compose restart app
```

### Frontend cached stale `VITE_API_URL`

Frontend env vars are baked at **build time**. After editing `.env`:

```bash
docker compose build web
docker compose up -d web
```

### Reset APP_KEY (this invalidates encrypted data!)

```bash
docker compose exec app rm /var/www/backend/storage/.app_key
docker compose exec app php artisan key:generate --force
docker compose restart app
```

---

## Production hardening checklist

Before pointing real traffic at this stack:

- [ ] Rotate `DB_ROOT_PASSWORD`, `DB_PASSWORD` away from defaults
- [ ] Set `APP_URL` to the real public URL (affects URL helpers,
      mail links, etc.)
- [ ] Set `APP_DEBUG=false` (already the default)
- [ ] Put nginx behind a TLS terminator (Caddy, Cloudflare, or
      add a `certbot` sidecar)
- [ ] Restrict MySQL & Redis to the internal network (already done —
      they have no host port published)
- [ ] Set up a backup job for the `mysql_data` and `app_storage`
      volumes
- [ ] Replace sandbox payment credentials (Fiuu, ToyyibPay) with prod
