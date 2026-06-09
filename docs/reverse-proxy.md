# Wiring this stack into `/opt/reverse-proxy`

The VPS already has a templating reverse proxy at `/opt/reverse-proxy/`
that reads env vars like `QBOTU_DOMAIN` + `QBOTU_UPSTREAM` and emits TLS
config for each project. Add Aigenius to it as another upstream.

---

## 1.  Pick a host port for Aigenius

`QBOTU` already owns `:8081`. Anything else free works — `:8082` is the
suggested default. Set this in **`aigenius-full/.env`** on the VPS:

```env
HTTP_BIND=127.0.0.1     # don't expose the container port publicly
HTTP_PORT=8082
APP_URL=https://aigenius-staging.qbot.now
APP_ENV=production
APP_DEBUG=false
TRUSTED_PROXIES=*       # honor X-Forwarded-* from the reverse proxy
SANCTUM_STATEFUL_DOMAINS=aigenius-staging.qbot.now
```

Then bring it up:

```bash
cd /opt/aigenius-full
./deploy.sh --init
```

`HTTP_BIND=127.0.0.1` matters — the container's nginx is now only
reachable from localhost, so the reverse proxy is the only public entry
point. Anyone scanning the VPS won't find the raw container port open.

---

## 2.  Add Aigenius to `/opt/reverse-proxy/.env`

Append these lines (no new sections, just more vars):

```env
# --- Aigenius (single-origin: SPA + Laravel + Superadmin all on one host) ---
AIGENIUS_DOMAIN=aigenius-staging.qbot.now
AIGENIUS_UPSTREAM=127.0.0.1:8082
```

If your proxy uses a template loop over `*_DOMAIN`/`*_UPSTREAM` pairs,
that's all you need. Otherwise, copy whatever stanza handles `QBOTU_*`
and duplicate it as `AIGENIUS_*`. The shape is identical — one domain,
one upstream port — because Aigenius does its own internal routing for
`/api`, `/superadmin`, `/storage`, etc.

---

## 3.  Reload the reverse proxy

```bash
cd /opt/reverse-proxy
docker compose up -d         # or whatever your proxy reload command is
```

Cert provisioning (`ACME_EMAIL=fitri@craveasia.com`) should kick in
automatically for the new hostname.

---

## 4.  Verify

```bash
curl -I https://aigenius-staging.qbot.now/healthz       # → 200 ok
curl -I https://aigenius-staging.qbot.now/api/          # → 200 JSON
curl -I https://aigenius-staging.qbot.now/superadmin/login   # → 200 HTML
```

All three should hit the same upstream and be served by the Aigenius
nginx container — paths handle the routing inside.

---

## Why single-domain instead of separate `api.` + `app.`?

The `QBOTU_DOMAIN` / `QBOTU_API_DOMAIN` split made sense for QBotU
because QBotU is a backend that serves multiple front-ends, including
one on a CDN. Aigenius is different:

| Aigenius feature                  | Same-origin?  | Why |
|----------------------------------|---------------|-----|
| Sanctum cookie auth (SPA)         | required      | Cross-origin cookies need `SameSite=None; Secure` + matching `SESSION_DOMAIN` — fragile. |
| Superadmin Blade panel            | required      | Server-rendered, shares Laravel session — must be the same host the admin logged in on. |
| Uploaded asset URLs (`/storage/`) | required      | Stored as relative paths in DB; splitting domains forces a rewrite or a `VITE_ASSETS_URL` override on the frontend. |
| Capacitor mobile app              | doesn't care  | Uses a hard-coded URL, single or split is indifferent. |
| Vite-built SPA                    | already so    | `VITE_API_URL=/api` is relative — works regardless of host. |

So: one domain, one upstream, one TLS cert. Splitting buys nothing here
and breaks two of the four routes if misconfigured.

---

## If you ever DO want to split domains

Two ways:

**A) Two upstream ports** (cleanest, but two stacks)
Run a second instance of this `docker-compose.yml` with a different
`HTTP_PORT`, configured to serve only the SPA or only the API. Point
`AIGENIUS_DOMAIN` at one and `AIGENIUS_API_DOMAIN` at the other.

**B) Host-based routing inside this nginx** (more compact)
Edit [docker/nginx/site.conf](../docker/nginx/site.conf): add a second
`server` block matching `server_name api.aigenius-staging.qbot.now`
that drops the `/api/` strip and exposes Laravel directly at `/`. Leave
the existing `server` for the app domain.

Either way, you'll also need to:

* Set `VITE_API_URL=https://api.aigenius-staging.qbot.now` in `.env`
  and rebuild `web` (the SPA bakes the URL in at build time).
* Set `SANCTUM_STATEFUL_DOMAINS` to include both hosts.
* Set `SESSION_DOMAIN=.aigenius-staging.qbot.now` (leading dot — shares
  the cookie across subdomains).
* Re-test the superadmin login flow end-to-end on both hosts.
