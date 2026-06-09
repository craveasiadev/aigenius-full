# syntax=docker/dockerfile:1.6
# =========================================================
# Stage 1 — Build React frontend
# =========================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Build-time config — defaults route through nginx /api on same origin
ARG VITE_API_URL=/api
ARG VITE_ASSETS_URL=
ARG VITE_BASE=/
ARG VITE_FIREBASE_API_KEY=
ARG VITE_FIREBASE_AUTH_DOMAIN=
ARG VITE_FIREBASE_PROJECT_ID=
ARG VITE_FIREBASE_STORAGE_BUCKET=
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=
ARG VITE_FIREBASE_APP_ID=
ARG VITE_FIREBASE_VAPID_KEY=

ENV VITE_API_URL=$VITE_API_URL \
    VITE_ASSETS_URL=$VITE_ASSETS_URL \
    VITE_BASE=$VITE_BASE \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_VAPID_KEY=$VITE_FIREBASE_VAPID_KEY

# 1) deps layer (cached unless package*.json change)
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --prefer-offline

# 2) source + build
COPY frontend/ ./
RUN npm run build

# =========================================================
# Stage 2 — Laravel public assets (used by nginx for static fallthrough)
# =========================================================
FROM alpine:3.20 AS backend-public
COPY backend/public /backend-public

# =========================================================
# Stage 3 — Nginx runtime
# =========================================================
FROM nginx:1.27-alpine AS runtime

# Add gzip/brotli-friendly base config
RUN rm -f /etc/nginx/conf.d/default.conf

# Frontend SPA build (immutable per image)
COPY --from=frontend-builder /app/dist /var/www/frontend

# Laravel public files (favicon, robots, fiuu callbacks etc.).
# storage/ symlink target is shared via Docker volume at runtime.
COPY --from=backend-public /backend-public /var/www/backend/public

# Our server config
COPY docker/nginx/nginx.conf            /etc/nginx/nginx.conf
COPY docker/nginx/site.conf             /etc/nginx/conf.d/aigenius.conf

# Make sure nginx user can read everything we serve
RUN chown -R nginx:nginx /var/www

EXPOSE 80

# Default nginx CMD is fine
