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

Two equivalent ways — `deploy.sh` is the recommended one:

```bash
# A) One script handles everything:
./deploy.sh --init                       # first deploy: build + up + bootstrap
./deploy.sh --update                     # everyday "ship it": pull + rebuild + up
./deploy.sh --logs app                   # tail Laravel logs
./deploy.sh --help                       # full flag reference

# B) Or raw docker compose if you prefer:
cp .env.example .env                     # edit secrets first
docker compose up -d --build
docker compose logs -f app
```

First boot takes ~3–5 min (Composer install + npm build + migrations
+ seeders). Subsequent boots: ~15 s.

Default URL: **http://localhost**
Superadmin: **http://localhost/superadmin/login**
(seeded creds: `superadmin@test.com` / `SuperAdmin123!`)

### deploy.sh flag reference

| Flag | What it does |
|------|--------------|
| `--init` | First-time deploy: build + up + wait for healthy |
| `--update` | git pull → rebuild changed images → recreate containers (preserves data) |
| `--restart` | Restart containers (no rebuild) |
| `--down` | Stop containers (data preserved) |
| `--pull` | Just `git pull`, no docker work |
| `--build` | Rebuild images only |
| `--only=SERVICE` | Limit `--build`/`--restart`/`--update` to one service (e.g. `--only=web`) |
| `--no-build` | Skip image rebuild when combined with `--update` |
| `--status` | Show container status |
| `--logs [svc]` | Tail logs (optionally for one service) |
| `--migrate` | Run `php artisan migrate --force` |
| `--seed` | Re-run seeders (resets the seed marker — prompts for confirmation) |
| `--cache` | Rebuild Laravel config/route/view caches |
| `--fresh` | DROP all DB tables + remigrate + reseed (prompts; destructive) |
| `--nuke` | Stop containers AND delete all volumes (prompts; irreversible) |
| `--yes` / `-y` | Skip confirmation prompts (for CI / automation) |
| `--help` | Show full help |

Common recipes:

```bash
./deploy.sh --update --only=web          # rebuild just the SPA after a frontend change
./deploy.sh --restart --only=queue       # bounce the queue worker
./deploy.sh --fresh --yes                # nuke DB + reseed (staging only!)
./deploy.sh --update --no-build          # quick recreate without rebuilding
```

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

## VPS deployment (behind a reverse proxy)

The stack is designed to sit behind a TLS-terminating reverse proxy
(Caddy, Traefik, nginx, etc.) — typical setup is one proxy in front
of multiple Docker projects, each on its own loopback port.

### One-time on the VPS

```bash
# 1. Clone
cd /opt
git clone https://github.com/craveasiadev/aigenius-full.git
cd aigenius-full

# 2. Create production .env (don't commit this)
cp .env.example .env
nano .env
```

Set these production values in `.env`:

```env
HTTP_BIND=127.0.0.1                # only the reverse proxy sees it
HTTP_PORT=8082                     # any free loopback port; 8082 if QBOTU has 8081
APP_URL=https://aigenius-staging.qbot.now
APP_ENV=production
APP_DEBUG=false
TRUSTED_PROXIES=*                  # honor X-Forwarded-Proto from the proxy
SANCTUM_STATEFUL_DOMAINS=aigenius-staging.qbot.now
DB_ROOT_PASSWORD=…                 # strong random
DB_PASSWORD=…                      # strong random
# …plus the OPENAI / FIUU / MAILERSEND / etc. secrets
```

Then bring it up:

```bash
./deploy.sh --init
```

### Wire it into `/opt/reverse-proxy`

This stack uses a **single origin** — one domain, one upstream port.
SPA, Laravel API, superadmin Blade and uploaded files all live behind
the same nginx. So you only need one upstream entry.

Append to `/opt/reverse-proxy/.env`:

```env
# --- Aigenius ---
AIGENIUS_DOMAIN=aigenius-staging.qbot.now
AIGENIUS_UPSTREAM=127.0.0.1:8082
```

Then reload the proxy (`docker compose up -d` in `/opt/reverse-proxy`).
TLS provisions automatically via the existing `ACME_EMAIL`.

Verify:

```bash
curl -I https://aigenius-staging.qbot.now/healthz             # 200
curl -I https://aigenius-staging.qbot.now/api/                # 200 JSON
curl -I https://aigenius-staging.qbot.now/superadmin/login    # 200 HTML
```

Full reverse-proxy walkthrough including the "why single domain"
rationale and "what if I want to split" notes: [docs/reverse-proxy.md](docs/reverse-proxy.md).

### Daily updates on the VPS

```bash
cd /opt/aigenius-full
./deploy.sh --update             # git pull + rebuild + recreate
```

For frontend-only changes (~30 s instead of ~3 min):

```bash
./deploy.sh --update --only=web
```

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
