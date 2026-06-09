# syntax=docker/dockerfile:1.6
# =========================================================
# Stage 1 — Composer dependencies (cached separately)
#   Use a PHP 8.3 CLI base so vendor packages with `php: 8.1 - 8.4`
#   constraints (nette/schema, league/config, etc.) resolve cleanly.
#   The official `composer:2` tag drifted to PHP 8.5 in late 2025
#   which breaks lock files pinned by the runtime stage.
# =========================================================
FROM php:8.3-cli-alpine AS vendor

# Composer binary — pin to a known-good release that supports PHP 8.3
COPY --from=composer:2.8 /usr/bin/composer /usr/bin/composer

# Minimum extensions composer needs to resolve a Laravel 12 lockfile
RUN apk add --no-cache git unzip libzip-dev icu-dev \
    && docker-php-ext-install -j$(nproc) zip intl \
    && apk del libzip-dev icu-dev

WORKDIR /app
COPY backend/composer.json backend/composer.lock ./

# Install prod deps only, no scripts (artisan not available yet)
RUN --mount=type=cache,target=/tmp/composer-cache \
    COMPOSER_CACHE_DIR=/tmp/composer-cache \
    composer install \
        --no-dev \
        --no-scripts \
        --no-autoloader \
        --prefer-dist \
        --no-interaction \
        --no-progress

# =========================================================
# Stage 2 — PHP-FPM runtime
# =========================================================
FROM php:8.3-fpm-alpine AS runtime

# ---- system deps + php extensions ---------------------------------
# $PHPIZE_DEPS expands to: autoconf dpkg-dev file gcc g++ libc-dev make pkgconf re2c
# These are required by `pecl install` (which runs phpize).
RUN apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        libpng-dev libjpeg-turbo-dev libwebp-dev freetype-dev \
        oniguruma-dev libxml2-dev libzip-dev icu-dev \
 && apk add --no-cache \
        bash \
        curl \
        mysql-client \
        tzdata \
        git \
        unzip \
        supervisor \
        libpng libjpeg-turbo libwebp freetype libzip icu \
 && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
 && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        intl \
        opcache \
 && pecl install redis \
 && docker-php-ext-enable redis \
 # Strip build deps to keep image small
 && apk del --no-network .build-deps

# Composer binary (for runtime artisan operations)
COPY --from=composer:2.8 /usr/bin/composer /usr/bin/composer

# ---- PHP / FPM configuration ---------------------------------------
COPY docker/php/php.ini      /usr/local/etc/php/conf.d/zz-app.ini
COPY docker/php/opcache.ini  /usr/local/etc/php/conf.d/zz-opcache.ini
COPY docker/php/www.conf     /usr/local/etc/php-fpm.d/zz-www.conf

# ---- application files --------------------------------------------
WORKDIR /var/www/backend

# vendor first (rarely changes), then app code
COPY --from=vendor /app/vendor ./vendor
COPY backend/ ./

# Generate optimized autoloader now that the full app is present
RUN composer dump-autoload --optimize --classmap-authoritative --no-dev

# Ensure runtime dirs exist + correct ownership
RUN mkdir -p storage/framework/cache/data \
            storage/framework/sessions \
            storage/framework/views \
            storage/logs \
            bootstrap/cache \
    && chown -R www-data:www-data /var/www/backend \
    && chmod -R 775 storage bootstrap/cache

# ---- entrypoint ----------------------------------------------------
COPY docker/php/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm", "-F"]
