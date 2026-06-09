-- Rollback / teardown for aipreneur_shop_data.sql. Run before re-applying the
-- up migration if you want a clean slate.
--
-- WARNING: this DROPS the tables and ALL their data. Back up first
--          (see the EXPORT section of aipreneur_shop_data.sql) if the data
--          matters. No foreign keys are declared between these tables, so the
--          drop order below is for tidiness, not dependency safety.

DROP TABLE IF EXISTS `aipreneur_persona_profiles`;
DROP TABLE IF EXISTS `aipreneur_reward_redemptions`;
DROP TABLE IF EXISTS `aipreneur_token_history`;
DROP TABLE IF EXISTS `aipreneur_transactions`;
DROP TABLE IF EXISTS `aipreneur_rewards`;
DROP TABLE IF EXISTS `aipreneur_innovations`;
DROP TABLE IF EXISTS `aipreneur_influencer_campaigns`;
DROP TABLE IF EXISTS `aipreneur_marketing_assets`;
DROP TABLE IF EXISTS `aipreneur_campaigns`;
DROP TABLE IF EXISTS `aipreneur_decoration_items`;
DROP TABLE IF EXISTS `aipreneur_decorations`;
DROP TABLE IF EXISTS `aipreneur_interviews`;
DROP TABLE IF EXISTS `aipreneur_staff`;
DROP TABLE IF EXISTS `aipreneur_products`;
DROP TABLE IF EXISTS `aipreneur_business`;
