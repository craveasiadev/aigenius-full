-- ───────────────────────────────────────────────────────────────────────────
--  aipreneur_collection_data — server-side storage for the magical-layer
--  collection (pets, inventions, hidden secrets, daily quest status).
--
--  Why this exists:
--    These collectibles currently live in the browser's localStorage (see
--    src/lib/collection.ts). That means they disappear if the kid switches
--    device, clears their browser, or logs in somewhere new. This schema
--    is the canonical relational home so the collection survives across
--    devices and can be exported / re-imported alongside the shop data.
--
--  What it covers (mirrors src/lib/collection.ts + src/data/pets.ts):
--      aipreneur_pet_unlocks      — every pet the student has unlocked
--                                   (one row per ownership, regardless of
--                                   how it was earned)
--      aipreneur_collections      — singleton per-student row: active pet,
--                                   daily-quest stamp, sfx preference
--      aipreneur_inventions       — invention cards brewed in the lab
--      aipreneur_secrets_found    — hidden tap-spots the student has
--                                   discovered (drives legendary pet
--                                   unlocks too)
--
--  Identity model:
--    Same as `aipreneur_shop_data.sql` — every row is keyed off
--    `student_id` (the genius-profile owner). One student = one
--    `aipreneur_collections` row; pets / inventions / secrets are
--    many-to-one under them.
--
--  ID types:
--    Front-end models pet ids as static strings (e.g. 'tiger', 'cat',
--    'penguin') — see src/data/pets.ts. We store them as VARCHAR(60)
--    rather than UUIDs so dumps stay readable. Invention card rows have
--    their own client-generated CHAR(36) id since they're created at
--    runtime.
--
--  Dialect:
--    MySQL 8. PostgreSQL notes live at the bottom of this file (same
--    table as the shop-data file).
--
--  Re-run safety:
--    Every table uses `IF NOT EXISTS`. Use the companion
--    `aipreneur_collection_data_down.sql` to drop everything.
-- ───────────────────────────────────────────────────────────────────────────

-- ── 1. COLLECTIONS — singleton wallet for the magical layer ──────────────────
-- One row per student. Holds the small set of "current" / "preference"
-- fields that don't deserve their own table. Live-updated each time the
-- student switches active pet, completes a daily quest, or toggles sfx.
CREATE TABLE IF NOT EXISTS `aipreneur_collections` (
  `id`                       CHAR(36)      NOT NULL,
  `student_id`               CHAR(36)      NOT NULL,        -- genius-profile owner
  -- ── Active pet (FK-like reference to aipreneur_pet_unlocks.pet_id) ──
  -- NULL when the student has no pet active. Always one of the pet ids
  -- listed in src/data/pets.ts.
  `active_pet_id`            VARCHAR(60)   NULL,
  -- ── Daily creative quest ─────────────────────────────────────────────
  `last_quest_date`          DATE          NULL,            -- YYYY-MM-DD
  `quest_done_today`         TINYINT(1)    NOT NULL DEFAULT 0,
  -- ── Player preference ────────────────────────────────────────────────
  `sfx_enabled`              TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`               TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`               TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  -- One collections row per student (mirrors aipreneur_business).
  UNIQUE KEY `aipreneur_collections_student_unique` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. PET UNLOCKS — every pet the student owns ──────────────────────────────
-- One row per (student_id, pet_id). The `unlock_source` records HOW the
-- pet was acquired so we can audit / sanity-check / fire analytics later.
-- Possible sources match src/data/pets.ts PetUnlock types:
--    'starter'  — granted on first visit (bunny / chick / bee)
--    'badge'    — claimed via an achievement (e.g. 'first_steps')
--    'coins'    — bought from the Mystery Bazaar Pet Stall
--    'secret'   — found a hidden tap-spot (legendary tier)
--    'gift'     — manually granted by an admin (kept for future)
CREATE TABLE IF NOT EXISTS `aipreneur_pet_unlocks` (
  `id`              CHAR(36)        NOT NULL,
  `student_id`      CHAR(36)        NOT NULL,
  `pet_id`          VARCHAR(60)     NOT NULL,             -- e.g. 'tiger', 'penguin'
  `unlock_source`   ENUM('starter','badge','coins','secret','gift') NOT NULL,
  `source_ref`      VARCHAR(120)    NULL,                 -- badge id / secret id / NULL
  `coins_spent`     INT UNSIGNED    NOT NULL DEFAULT 0,   -- > 0 only when source = 'coins'
  `unlocked_at`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  -- A student can only own each pet once.
  UNIQUE KEY `aipreneur_pet_unlocks_unique` (`student_id`, `pet_id`),
  KEY `aipreneur_pet_unlocks_student_idx` (`student_id`, `unlocked_at`),
  KEY `aipreneur_pet_unlocks_pet_idx`     (`pet_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. INVENTIONS — invention cards brewed in the lab ────────────────────────
-- One row per card the student has saved. Cards are client-generated
-- (Spark + LLM fallbacks in sparkService.ts), so the `id` matches the
-- CHAR(36) generated in the frontend.
-- The front-end caps the visible list at 40 items (oldest dropped first)
-- — we don't enforce that cap here so server backups stay lossless.
CREATE TABLE IF NOT EXISTS `aipreneur_inventions` (
  `id`              CHAR(36)        NOT NULL,
  `student_id`      CHAR(36)        NOT NULL,
  `name`            VARCHAR(120)    NOT NULL,
  `emoji`           VARCHAR(16)     NOT NULL DEFAULT '✨',
  `blurb`           TEXT            NULL,
  `rarity`          ENUM('common','rare','epic','legendary') NOT NULL DEFAULT 'common',
  -- Front-end stores createdAt as epoch ms; we keep the timestamp here
  -- so SQL date functions work, and an `epoch_ms` column for lossless
  -- round-tripping back to the client struct.
  `epoch_ms`        BIGINT UNSIGNED NOT NULL,
  `created_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aipreneur_inventions_student_idx` (`student_id`, `created_at`),
  KEY `aipreneur_inventions_rarity_idx`  (`rarity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. SECRETS FOUND — hidden tap-spots discovered ───────────────────────────
-- One row per (student_id, secret_id). Discovering a secret can also
-- grant a legendary pet (see MagicalOverlay.tsx + petForSecret in
-- src/data/pets.ts) — that pet ends up in `aipreneur_pet_unlocks` with
-- `unlock_source = 'secret'` and `source_ref = <secret_id>`.
CREATE TABLE IF NOT EXISTS `aipreneur_secrets_found` (
  `id`              CHAR(36)        NOT NULL,
  `student_id`      CHAR(36)        NOT NULL,
  `secret_id`       VARCHAR(120)    NOT NULL,             -- e.g. 'secret_corner_tl'
  `found_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `aipreneur_secrets_found_unique` (`student_id`, `secret_id`),
  KEY `aipreneur_secrets_found_student_idx` (`student_id`, `found_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────────────────
--  PostgreSQL notes (same as the shop-data file):
--    CHAR(36)            → UUID
--    JSON                → JSONB
--    TINYINT(1)          → BOOLEAN
--    TIMESTAMP           → TIMESTAMPTZ
--    ENUM(...)           → CHECK constraint or CREATE TYPE … AS ENUM
--    `ON UPDATE CURRENT_TIMESTAMP` has no PG equivalent — use a BEFORE
--      UPDATE trigger or set updated_at = NOW() in the app on every write.
-- ───────────────────────────────────────────────────────────────────────────

-- ───────────────────────────────────────────────────────────────────────────
--  EXPORT / MIGRATE TO ANOTHER DEVICE
--
--  A. Whole magical-layer dataset (all students) — schema + data:
--       mysqldump -u <user> -p <db> \
--         aipreneur_collections aipreneur_pet_unlocks \
--         aipreneur_inventions aipreneur_secrets_found \
--         > aipreneur_collection_backup.sql
--
--     Restore on the new device:
--       mysql -u <user> -p <db> < aipreneur_collection_backup.sql
--
--  B. Just ONE student's collection (replace :SID with the student_id):
--       for t in aipreneur_collections aipreneur_pet_unlocks \
--                aipreneur_inventions aipreneur_secrets_found; do
--         mysqldump -u <user> -p <db> "$t" --where="student_id='SID'" \
--           >> my_collection.sql
--       done
--
--  C. Combined export with the shop data — single round trip:
--       mysqldump -u <user> -p <db> \
--         aipreneur_business aipreneur_products aipreneur_staff \
--         aipreneur_interviews aipreneur_decorations aipreneur_decoration_items \
--         aipreneur_campaigns aipreneur_marketing_assets \
--         aipreneur_influencer_campaigns aipreneur_innovations \
--         aipreneur_rewards aipreneur_transactions aipreneur_token_history \
--         aipreneur_reward_redemptions aipreneur_persona_profiles \
--         aipreneur_collections aipreneur_pet_unlocks \
--         aipreneur_inventions aipreneur_secrets_found \
--         > aipreneur_full_backup.sql
--
--  D. CSV per table (e.g. all pet unlocks for one kid):
--       SELECT * FROM aipreneur_pet_unlocks
--       WHERE student_id = 'SID'
--       INTO OUTFILE '/tmp/my_pets.csv'
--       FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
--       LINES TERMINATED BY '\n';
-- ───────────────────────────────────────────────────────────────────────────
