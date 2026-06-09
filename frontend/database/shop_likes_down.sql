-- Rollback / teardown for shop_likes.sql. Run before re-applying the up
-- migration if you want a clean slate. CASCADE-equivalent ordering: drop
-- the trigger first (if installed) so it doesn't block the table drop.

DROP TRIGGER IF EXISTS `shop_likes_after_insert`;

DROP TABLE IF EXISTS `shop_likes`;
DROP TABLE IF EXISTS `shop_visitors`;
