-- ───────────────────────────────────────────────────────────────────────────
--  shop_likes — server-side storage for public-shop "Like Shop" events.
--
--  Why this exists:
--    The current front-end stores "this visitor has liked this shop" in
--    localStorage. That works for a single device + browser, but the like
--    is lost when the user:
--      • clears their browser data
--      • switches device (phone → laptop)
--      • opens the same shop in another browser
--    Migrating dedup to the database fixes all three — likes follow the
--    viewer's identity, not their device.
--
--  Identity model:
--    Public shop pages are open to anonymous visitors, so a row identifies
--    its viewer by ONE of:
--      • `user_id`     — the authenticated user (parent / student / teacher)
--                        when the viewer is logged in
--      • `visitor_id`  — a stable per-browser UUID the front-end mints once
--                        on first visit and persists in localStorage AND
--                        sends with every like request. Anonymous-but-stable.
--    The UNIQUE constraints below ensure one like per identity per shop.
--
--  Dialect:
--    Written for MySQL 8 (the Laravel default for this app). PostgreSQL
--    notes are inline as comments next to syntax that differs.
--
--  Re-run safety:
--    Uses `IF NOT EXISTS` so the file can be executed against any database
--    state without erroring. Drop the table only with the dedicated
--    `down.sql` companion if you want a clean re-create.
-- ───────────────────────────────────────────────────────────────────────────

-- ── Main table ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `shop_likes` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- The slug from the URL (/shop/<slug>). Stored even when shop_id is
  -- known because slugs are what the front-end already uses for dedup
  -- keys, and they survive shop_id renumbering on data imports.
  `shop_slug`     VARCHAR(255)    NOT NULL,
  -- Optional FK to the AIpreneur business row. Nullable because slugs
  -- predate FK enforcement in some legacy rows.
  `shop_id`       BIGINT UNSIGNED NULL,
  -- Logged-in viewer (NULL for anonymous visits).
  `user_id`       BIGINT UNSIGNED NULL,
  -- Anonymous-but-stable browser ID (UUID v4). Always populated by the
  -- front-end so we have something to dedup against even when user_id
  -- is NULL.
  `visitor_id`    CHAR(36)        NOT NULL,
  -- For forensics / soft rate-limit / abuse review. Not used for dedup.
  `ip_address`    VARCHAR(45)     NULL,            -- IPv4 (15) or IPv6 (45)
  `user_agent`    VARCHAR(500)    NULL,
  -- Where the like came from — handy for analytics later (e.g. share
  -- links vs. direct visits).
  `referrer`      VARCHAR(500)    NULL,
  `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),

  -- One like per logged-in user per shop. The COALESCE-on-NULL trick
  -- (NULLs don't collide in unique indexes in MySQL) is fine here —
  -- anonymous likes are deduped via the visitor index below.
  UNIQUE KEY `shop_likes_user_unique` (`shop_slug`, `user_id`),

  -- One like per anonymous browser per shop.
  UNIQUE KEY `shop_likes_visitor_unique` (`shop_slug`, `visitor_id`),

  -- Fast counts when rendering the shop page.
  KEY `shop_likes_shop_slug_idx`  (`shop_slug`),
  KEY `shop_likes_shop_id_idx`    (`shop_id`),
  KEY `shop_likes_user_id_idx`    (`user_id`),
  KEY `shop_likes_created_at_idx` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PostgreSQL equivalent:
--   CREATE TABLE IF NOT EXISTS shop_likes (
--     id           BIGSERIAL    PRIMARY KEY,
--     shop_slug    VARCHAR(255) NOT NULL,
--     shop_id      BIGINT,
--     user_id      BIGINT,
--     visitor_id   UUID         NOT NULL,
--     ip_address   INET,
--     user_agent   TEXT,
--     referrer     TEXT,
--     created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
--   );
--   CREATE UNIQUE INDEX shop_likes_user_unique     ON shop_likes (shop_slug, user_id);
--   CREATE UNIQUE INDEX shop_likes_visitor_unique  ON shop_likes (shop_slug, visitor_id);
--   CREATE INDEX shop_likes_shop_slug_idx          ON shop_likes (shop_slug);
--   CREATE INDEX shop_likes_shop_id_idx            ON shop_likes (shop_id);
--   CREATE INDEX shop_likes_user_id_idx            ON shop_likes (user_id);
--   CREATE INDEX shop_likes_created_at_idx         ON shop_likes (created_at);

-- ───────────────────────────────────────────────────────────────────────────
-- Reference queries — copy/paste into your API handler. None of these are
-- executed at migrate time; they live here as documentation.
-- ───────────────────────────────────────────────────────────────────────────

-- 1. RECORD A LIKE — safe to call repeatedly, never errors on duplicate.
--    Either the unique index swallows the row (idempotent) or a fresh row
--    is created. The endpoint can use the row count to decide whether to
--    bump `aipreneur_business.store_likes`.
--
--    INSERT IGNORE INTO shop_likes
--      (shop_slug, shop_id, user_id, visitor_id, ip_address, user_agent, referrer)
--    VALUES (?, ?, ?, ?, ?, ?, ?);
--
--    -- PostgreSQL equivalent:
--    INSERT INTO shop_likes
--      (shop_slug, shop_id, user_id, visitor_id, ip_address, user_agent, referrer)
--    VALUES ($1, $2, $3, $4, $5, $6, $7)
--    ON CONFLICT DO NOTHING;

-- 2. CHECK IF VIEWER ALREADY LIKED — used on page load so the heart can
--    pre-fill without trusting the client's localStorage.
--
--    SELECT 1
--    FROM shop_likes
--    WHERE shop_slug = ?
--      AND (
--        (user_id IS NOT NULL AND user_id = ?) OR
--        (visitor_id = ?)
--      )
--    LIMIT 1;

-- 3. GET CURRENT LIKE COUNT FOR A SHOP — the canonical number to display.
--    Use this if you want to drop the denormalised `store_likes` column on
--    the business row entirely.
--
--    SELECT COUNT(*) AS total
--    FROM shop_likes
--    WHERE shop_slug = ?;

-- 4. KEEP THE LEGACY `store_likes` COUNTER IN SYNC (optional)
--    If you still want `aipreneur_business.store_likes` to mirror the
--    real count without changing the front-end, install this trigger.
--    Drop it later if you switch the front-end to read from query #3.
--
--    DELIMITER //
--    CREATE TRIGGER shop_likes_after_insert
--    AFTER INSERT ON shop_likes
--    FOR EACH ROW
--    BEGIN
--      IF NEW.shop_id IS NOT NULL THEN
--        UPDATE aipreneur_business
--           SET store_likes = store_likes + 1
--         WHERE id = NEW.shop_id;
--      END IF;
--    END//
--    DELIMITER ;

-- 5. EXPORT FOR MIGRATION TO ANOTHER DEVICE / INSTANCE.
--    Use the standard mysqldump form:
--      mysqldump -u <user> -p <db> shop_likes > shop_likes.sql
--    Or for CSV:
--      SELECT * FROM shop_likes
--      INTO OUTFILE '/tmp/shop_likes.csv'
--      FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
--      LINES TERMINATED BY '\n';

-- ───────────────────────────────────────────────────────────────────────────
-- Optional: visitor_id seed table.
--
-- Front-end mints a UUID on first visit, but if you want server-issued
-- visitor IDs (so they can't be trivially spoofed) install this table and
-- have the API return one on first call.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `shop_visitors` (
  `visitor_id`    CHAR(36)        NOT NULL,
  `first_seen_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `like_count`    INT UNSIGNED    NOT NULL DEFAULT 0,
  `ip_address`    VARCHAR(45)     NULL,
  `user_agent`    VARCHAR(500)    NULL,
  PRIMARY KEY (`visitor_id`),
  KEY `shop_visitors_last_seen_idx` (`last_seen_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
