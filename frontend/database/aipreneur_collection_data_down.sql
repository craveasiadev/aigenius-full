-- ───────────────────────────────────────────────────────────────────────────
--  aipreneur_collection_data_down — drop everything from
--  aipreneur_collection_data.sql in dependency-safe order.
--
--  Use when you want a clean slate before re-running the up migration:
--      mysql -u <user> -p <db> < aipreneur_collection_data_down.sql
--      mysql -u <user> -p <db> < aipreneur_collection_data.sql
--
--  Safety:
--    Every drop uses `IF EXISTS`, so this file is safe to run against any
--    state (fresh DB, already dropped, partial state, etc.).
--
--  These tables have no foreign keys pointing INTO them from the shop
--  tables, so order is for human readability only — dependency-free.
-- ───────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS `aipreneur_secrets_found`;
DROP TABLE IF EXISTS `aipreneur_inventions`;
DROP TABLE IF EXISTS `aipreneur_pet_unlocks`;
DROP TABLE IF EXISTS `aipreneur_collections`;
