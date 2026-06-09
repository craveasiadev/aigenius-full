-- ───────────────────────────────────────────────────────────────────────────
--  aipreneur_shop_data — full server-side storage for a student's AIpreneur
--  shop. One schema that captures EVERYTHING the game keeps about a shop so
--  it can be backed up / exported and re-imported on another device.
--
--  Why this exists:
--    Today most shop progress lives in the Laravel backend (and some in the
--    browser's localStorage — the in-shop mini-game state, daily tasks, etc.).
--    This file is the canonical relational schema for the durable shop data so
--    you can:
--      • move a student's whole shop between machines / environments
--      • take a point-in-time backup before a risky change
--      • rebuild a fresh database with the exact tables the app expects
--
--  What it covers (one table per real data model in src/services/aipreneurApi.ts
--  + onboardingApi.ts):
--      aipreneur_business            — the shop row (theme, stats, progress)
--      aipreneur_products            — products the student created
--      aipreneur_staff               — hired helpers
--      aipreneur_interviews          — staff interview transcripts
--      aipreneur_decorations         — applied mood/decoration themes
--      aipreneur_decoration_items    — individual placed interior items
--      aipreneur_campaigns           — marketing campaigns
--      aipreneur_marketing_assets    — generated posters / banners
--      aipreneur_influencer_campaigns— influencer collabs
--      aipreneur_innovations         — tech-lab upgrades
--      aipreneur_rewards             — coins / tokens / XP / level / streak
--      aipreneur_transactions        — finance ledger (income + expense)
--      aipreneur_token_history       — AI-token spend log
--      aipreneur_reward_redemptions  — partner-store redemptions
--      aipreneur_persona_profiles    — AI persona insights
--
--  Identity model:
--    Every shop-scoped table keys off `student_id` — the genius-profile id
--    that owns the shop (matches `student_id` in the TS models). One student
--    has exactly one business row; everything else is one-to-many under them.
--
--  ID types:
--    The front-end models every id as a string, so ids here are CHAR(36)
--    (UUID-shaped). If your backend actually uses integer auto-increment PKs,
--    swap `CHAR(36)` → `BIGINT UNSIGNED AUTO_INCREMENT` on `id` and
--    `CHAR(36)` → `BIGINT UNSIGNED` on the `*_id` FK columns. Nothing else
--    needs to change.
--
--  Dialect:
--    Written for MySQL 8 (Laravel default for this app). PostgreSQL notes are
--    inline next to syntax that differs (JSON→JSONB, TIMESTAMP→TIMESTAMPTZ,
--    CHAR(36)→UUID, TINYINT(1)→BOOLEAN).
--
--  Re-run safety:
--    Every table uses `IF NOT EXISTS`, so the file is safe to run against any
--    database state. Use the companion `aipreneur_shop_data_down.sql` to drop
--    everything for a clean re-create.
-- ───────────────────────────────────────────────────────────────────────────

-- ── 1. BUSINESS — the shop itself ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `aipreneur_business` (
  `id`                        CHAR(36)        NOT NULL,
  `student_id`                CHAR(36)        NOT NULL,   -- genius-profile owner
  `shop_theme`                VARCHAR(255)    NULL,
  `shop_url_slug`             VARCHAR(255)    NULL,
  `shop_image_url`            VARCHAR(1000)   NULL,       -- shop-only PNG
  `shop_scene_image_url`      VARCHAR(1000)   NULL,       -- shop + person + scene
  `shop_image_status`         ENUM('pending','generating','completed','failed') NULL,
  `shop_vibe`                 VARCHAR(255)    NULL,
  `shop_colors`               JSON            NULL,       -- string[]  (JSONB in PG)
  `shop_usp`                  VARCHAR(1000)   NULL,
  `exterior_config`           JSON            NULL,
  `interior_config`           JSON            NULL,
  `questionnaire_answers`     JSON            NULL,
  -- Module completion 0-100.
  `module_product_progress`   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `module_decorate_progress`  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `module_operation_progress` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `module_marketing_progress` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `module_innovation_progress`TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `module_csr_progress`       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  -- Money (kept as DECIMAL so cents never drift).
  `total_sales`               DECIMAL(12,2)   NOT NULL DEFAULT 0,
  `total_costs`               DECIMAL(12,2)   NOT NULL DEFAULT 0,
  `total_profit`              DECIMAL(12,2)   NOT NULL DEFAULT 0,
  `shop_launched`             TINYINT(1)      NOT NULL DEFAULT 0,
  `launched_at`               TIMESTAMP       NULL,
  `charity_percentage`        DECIMAL(5,2)    NOT NULL DEFAULT 0,
  `selected_cause`            VARCHAR(255)    NULL,
  `total_donated`             DECIMAL(12,2)   NOT NULL DEFAULT 0,
  `staff_overall_mood`        SMALLINT        NOT NULL DEFAULT 0,
  `popularity_level`          INT             NOT NULL DEFAULT 0,
  `store_visitors`            INT UNSIGNED    NOT NULL DEFAULT 0,
  `store_likes`               INT UNSIGNED    NOT NULL DEFAULT 0,
  `current_quest`             VARCHAR(255)    NULL,
  `streak_days`               INT UNSIGNED    NOT NULL DEFAULT 0,
  `last_csr_action_date`      DATE            NULL,
  `last_finance_game_date`    DATE            NULL,
  `opening_checklist`         JSON            NULL,       -- {products_created, staff_hired}
  `ribbon_cutting_completed`  TINYINT(1)      NOT NULL DEFAULT 0,
  `ribbon_cutting_at`         TIMESTAMP       NULL,
  `traffic_multiplier`        DECIMAL(6,3)    NOT NULL DEFAULT 1.000,
  `traffic_boost_expires_at`  TIMESTAMP       NULL,
  `created_at`                TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  -- One shop per student.
  UNIQUE KEY `aipreneur_business_student_unique` (`student_id`),
  UNIQUE KEY `aipreneur_business_slug_unique`    (`shop_url_slug`),
  KEY `aipreneur_business_launched_idx` (`shop_launched`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. PRODUCTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `aipreneur_products` (
  `id`                  CHAR(36)        NOT NULL,
  `student_id`          CHAR(36)        NOT NULL,
  `product_name`        VARCHAR(255)    NOT NULL,
  `description`         TEXT            NULL,
  `price`               DECIMAL(10,2)   NOT NULL DEFAULT 0,
  `positioning_strategy`VARCHAR(255)    NOT NULL DEFAULT '',
  `image_url`           VARCHAR(1000)   NULL,
  `image_source`        VARCHAR(255)    NULL,
  `image_status`        ENUM('pending','generating','completed','failed') NULL,
  `image_error`         VARCHAR(1000)   NULL,
  `image_prompt`        TEXT            NULL,
  `units_sold`          INT UNSIGNED    NOT NULL DEFAULT 0,
  `revenue_generated`   DECIMAL(12,2)   NOT NULL DEFAULT 0,
  `created_at`          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aipreneur_products_student_idx` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. STAFF ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `aipreneur_staff` (
  `id`                  CHAR(36)        NOT NULL,
  `student_id`          CHAR(36)        NOT NULL,
  `staff_role`          VARCHAR(120)    NOT NULL,
  `staff_name`          VARCHAR(120)    NOT NULL,
  `mood`                SMALLINT        NOT NULL DEFAULT 0,
  `energy`              SMALLINT        NOT NULL DEFAULT 0,
  `salary`              DECIMAL(10,2)   NOT NULL DEFAULT 0,
  `skills`              JSON            NULL,            -- string[]
  `hobbies`             JSON            NULL,            -- string[]
  `personality`         VARCHAR(500)    NULL,
  `interview_id`        CHAR(36)        NULL,
  `last_event`          VARCHAR(500)    NULL,
  `last_event_date`     TIMESTAMP       NULL,
  `behavior_traits`     JSON            NULL,            -- string[]
  `speed_modifier`      DECIMAL(6,3)    NOT NULL DEFAULT 1.000,
  `efficiency_modifier` DECIMAL(6,3)    NOT NULL DEFAULT 1.000,
  `created_at`          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aipreneur_staff_student_idx`   (`student_id`),
  KEY `aipreneur_staff_interview_idx` (`interview_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. INTERVIEWS (staff hiring transcripts) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS `aipreneur_interviews` (
  `id`              CHAR(36)        NOT NULL,
  `student_id`      CHAR(36)        NOT NULL,
  `npc_name`        VARCHAR(120)    NOT NULL,
  `npc_role`        VARCHAR(120)    NOT NULL,
  `npc_personality` JSON            NULL,
  `npc_avatar`      VARCHAR(1000)   NULL,
  `questions_asked` JSON            NULL,                -- object[]
  `responses`       JSON            NULL,                -- object[]
  `decision`        VARCHAR(120)    NULL,
  `created_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aipreneur_interviews_student_idx` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. DECORATIONS (applied mood themes) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `aipreneur_decorations` (
  `id`                          CHAR(36)      NOT NULL,
  `student_id`                  CHAR(36)      NOT NULL,
  `mood_theme`                  VARCHAR(120)  NOT NULL,
  `decoration_focus`            VARCHAR(120)  NULL,
  `happiness_boost`             DECIMAL(6,2)  NOT NULL DEFAULT 0,
  `price_willingness_multiplier`DECIMAL(6,3)  NOT NULL DEFAULT 1.000,
  `uniqueness_score`            DECIMAL(6,2)  NOT NULL DEFAULT 0,
  `cost`                        DECIMAL(10,2) NOT NULL DEFAULT 0,
  `applied_at`                  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aipreneur_decorations_student_idx` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6. DECORATION ITEMS (individual placed objects) ──────────────────────────
CREATE TABLE IF NOT EXISTS `aipreneur_decoration_items` (
  `id`          CHAR(36)        NOT NULL,
  `student_id`  CHAR(36)        NOT NULL,
  `item_type`   VARCHAR(120)    NOT NULL,
  `item_name`   VARCHAR(255)    NOT NULL,
  `item_config` JSON            NULL,
  `position_x`  DECIMAL(10,4)   NULL,
  `position_y`  DECIMAL(10,4)   NULL,
  `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aipreneur_decoration_items_student_idx` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 7. MARKETING CAMPAIGNS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `aipreneur_campaigns` (
  `id`               CHAR(36)       NOT NULL,
  `student_id`       CHAR(36)       NOT NULL,
  `campaign_name`    VARCHAR(255)   NOT NULL,
  `marketing_goal`   VARCHAR(255)   NOT NULL DEFAULT '',
  `color_style`      VARCHAR(120)   NULL,
  `channels`         JSON           NULL,                -- string[]
  `budget_coins`     DECIMAL(12,2)  NOT NULL DEFAULT 0,
  `reach`            INT UNSIGNED   NOT NULL DEFAULT 0,
  `likes`            INT UNSIGNED   NOT NULL DEFAULT 0,
  `new_visitors`     INT UNSIGNED   NOT NULL DEFAULT 0,
  `profit_generated` DECIMAL(12,2)  NOT NULL DEFAULT 0,
  `roi`              DECIMAL(8,3)   NOT NULL DEFAULT 0,
  `launched_at`      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aipreneur_campaigns_student_idx` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 8. MARKETING ASSETS (generated posters / banners) ────────────────────────
CREATE TABLE IF NOT EXISTS `aipreneur_marketing_assets` (
  `id`           CHAR(36)        NOT NULL,
  `student_id`   CHAR(36)        NOT NULL,
  `asset_type`   VARCHAR(120)    NOT NULL,
  `asset_url`    VARCHAR(1000)   NOT NULL,
  `asset_config` JSON            NULL,
  `placement`    VARCHAR(120)    NULL,
  `active`       TINYINT(1)      NOT NULL DEFAULT 1,
  `created_at`   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aipreneur_marketing_assets_student_idx` (`student_id`),
  KEY `aipreneur_marketing_assets_active_idx`  (`student_id`, `active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 9. INFLUENCER CAMPAIGNS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `aipreneur_influencer_campaigns` (
  `id`                CHAR(36)       NOT NULL,
  `student_id`        CHAR(36)       NOT NULL,
  `influencer_name`   VARCHAR(255)   NOT NULL,
  `influencer_tier`   VARCHAR(120)   NOT NULL,
  `influencer_avatar` VARCHAR(1000)  NULL,
  `influencer_niche`  VARCHAR(120)   NULL,
  `cost`              DECIMAL(12,2)  NOT NULL DEFAULT 0,
  `reach`             INT UNSIGNED   NOT NULL DEFAULT 0,
  `engagement`        INT UNSIGNED   NOT NULL DEFAULT 0,
  `conversions`       INT UNSIGNED   NOT NULL DEFAULT 0,
  `started_at`        TIMESTAMP      NULL,
  `ended_at`          TIMESTAMP      NULL,
  PRIMARY KEY (`id`),
  KEY `aipreneur_influencer_campaigns_student_idx` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 10. INNOVATIONS (tech-lab upgrades) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `aipreneur_innovations` (
  `id`                CHAR(36)       NOT NULL,
  `student_id`        CHAR(36)       NOT NULL,
  `tech_project`      VARCHAR(120)   NOT NULL,
  `design_image_url`  VARCHAR(1000)  NULL,
  `quiz_answers`      JSON           NULL,
  `efficiency_boost`  DECIMAL(6,3)   NOT NULL DEFAULT 0,
  `cost_increase`     DECIMAL(6,3)   NOT NULL DEFAULT 0,
  `happiness_boost`   DECIMAL(6,3)   NOT NULL DEFAULT 0,
  `is_active`         TINYINT(1)     NOT NULL DEFAULT 1,
  `upgrade_level`     INT UNSIGNED   NOT NULL DEFAULT 1,
  `scaled_effects`    JSON           NULL,               -- {sales_boost,popularity_boost,mood_boost}
  `lab_level`         INT UNSIGNED   NOT NULL DEFAULT 1,
  `unlocked_at`       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aipreneur_innovations_student_idx` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 11. REWARDS (wallet: coins / tokens / XP / level / streak) ───────────────
CREATE TABLE IF NOT EXISTS `aipreneur_rewards` (
  `id`                    CHAR(36)      NOT NULL,
  `student_id`            CHAR(36)      NOT NULL,
  `coins`                 INT           NOT NULL DEFAULT 0,
  `ai_tokens`             INT           NOT NULL DEFAULT 0,
  `total_coins_earned`    INT           NOT NULL DEFAULT 0,
  `stars`                 INT           NOT NULL DEFAULT 0,
  `xp`                    INT           NOT NULL DEFAULT 0,
  `level`                 INT           NOT NULL DEFAULT 1,
  `badges`                JSON          NULL,            -- string[]
  `current_streak`        INT           NOT NULL DEFAULT 0,
  `longest_streak`        INT           NOT NULL DEFAULT 0,
  `last_activity_date`    DATE          NULL,
  `last_daily_claim_date` DATE          NULL,
  `created_at`            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `aipreneur_rewards_student_unique` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 12. TRANSACTIONS (finance ledger) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `aipreneur_transactions` (
  `id`                   CHAR(36)        NOT NULL,
  `student_id`           CHAR(36)        NOT NULL,
  `type`                 ENUM('income','expense') NOT NULL,
  `category`             VARCHAR(120)    NOT NULL,
  `description`          VARCHAR(500)    NOT NULL DEFAULT '',
  `amount`               DECIMAL(12,2)   NOT NULL DEFAULT 0,
  `tokens`               INT             NULL,
  `coin_balance_after`   DECIMAL(12,2)   NOT NULL DEFAULT 0,
  `token_balance_after`  INT             NULL,
  `created_at`           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aipreneur_transactions_student_idx`  (`student_id`),
  KEY `aipreneur_transactions_created_idx`  (`student_id`, `created_at`),
  KEY `aipreneur_transactions_category_idx` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 13. TOKEN HISTORY (AI-token spend log) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS `aipreneur_token_history` (
  `id`          CHAR(36)        NOT NULL,
  `student_id`  CHAR(36)        NOT NULL,
  `operation`   VARCHAR(120)    NOT NULL,                -- product_image, marketing_asset, …
  `tokens_used` INT             NOT NULL DEFAULT 0,
  `reason`      VARCHAR(500)    NULL,
  `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aipreneur_token_history_student_idx` (`student_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 14. REWARD STORE REDEMPTIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `aipreneur_reward_redemptions` (
  `id`            CHAR(36)        NOT NULL,
  `student_id`    CHAR(36)        NOT NULL,
  `item_id`       VARCHAR(120)    NOT NULL,              -- store item key
  `item_name`     VARCHAR(255)    NOT NULL,
  `category`      VARCHAR(120)    NULL,
  `price`         INT             NOT NULL DEFAULT 0,    -- tokens spent
  `redemption_code` VARCHAR(120)  NULL,
  `partner`       VARCHAR(255)    NULL,
  `status`        VARCHAR(60)     NOT NULL DEFAULT 'redeemed',
  `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aipreneur_reward_redemptions_student_idx` (`student_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 15. PERSONA PROFILES (AI insights) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS `aipreneur_persona_profiles` (
  `id`            CHAR(36)        NOT NULL,
  `student_id`    CHAR(36)        NOT NULL,
  `strengths`     JSON            NULL,                  -- string[]
  `growth_areas`  JSON            NULL,                  -- string[]
  `learning_style`VARCHAR(255)    NULL,
  `fun_facts`     JSON            NULL,                  -- string[]
  `trait_scores`  JSON            NULL,                  -- { trait: number }
  `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `aipreneur_persona_student_unique` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────────────────
--  PostgreSQL notes (apply across all tables above):
--    CHAR(36)            → UUID
--    JSON                → JSONB
--    TINYINT(1)          → BOOLEAN
--    TIMESTAMP           → TIMESTAMPTZ
--    ENUM(...)           → either a CHECK constraint or a CREATE TYPE … AS ENUM
--    `ON UPDATE CURRENT_TIMESTAMP` has no PG equivalent — use a BEFORE UPDATE
--      trigger, or set updated_at = NOW() in the app on every write.
--    Auto-now defaults    → DEFAULT NOW()
-- ───────────────────────────────────────────────────────────────────────────

-- ───────────────────────────────────────────────────────────────────────────
--  EXPORT / MIGRATE TO ANOTHER DEVICE
--
--  A. Whole AIpreneur dataset (all students) — schema + data:
--       mysqldump -u <user> -p <db> \
--         aipreneur_business aipreneur_products aipreneur_staff \
--         aipreneur_interviews aipreneur_decorations aipreneur_decoration_items \
--         aipreneur_campaigns aipreneur_marketing_assets \
--         aipreneur_influencer_campaigns aipreneur_innovations \
--         aipreneur_rewards aipreneur_transactions aipreneur_token_history \
--         aipreneur_reward_redemptions aipreneur_persona_profiles \
--         > aipreneur_backup.sql
--
--     Restore on the new device:
--       mysql -u <user> -p <db> < aipreneur_backup.sql
--
--  B. Just ONE student's shop (replace :SID with the student_id):
--       mysqldump -u <user> -p <db> aipreneur_business \
--         --where="student_id='SID'" > my_shop_business.sql
--       -- repeat per table with the same --where, OR use a single shell loop:
--       for t in aipreneur_business aipreneur_products aipreneur_staff \
--                aipreneur_interviews aipreneur_decorations \
--                aipreneur_decoration_items aipreneur_campaigns \
--                aipreneur_marketing_assets aipreneur_influencer_campaigns \
--                aipreneur_innovations aipreneur_rewards \
--                aipreneur_transactions aipreneur_token_history \
--                aipreneur_reward_redemptions aipreneur_persona_profiles; do
--         mysqldump -u <user> -p <db> "$t" --where="student_id='SID'" >> my_shop.sql
--       done
--
--  C. CSV export of a single table (e.g. transactions):
--       SELECT * FROM aipreneur_transactions
--       WHERE student_id = 'SID'
--       INTO OUTFILE '/tmp/my_transactions.csv'
--       FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
--       LINES TERMINATED BY '\n';
-- ───────────────────────────────────────────────────────────────────────────
