-- BUG-1 FIX: Prevent duplicate deposit credits from duplicate Telegram webhook events.
-- Adds a composite UNIQUE index on (telegram_message_id, telegram_chat_id) so that
-- concurrent webhook retries cannot both insert into upi_webhook_transactions.
-- The old non-unique index idx_telegram_msg is dropped as it becomes redundant.

-- Step 1: Drop the old non-unique index
DROP PROCEDURE IF EXISTS _drop_idx_telegram_msg;
DELIMITER $$
CREATE PROCEDURE _drop_idx_telegram_msg()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'upi_webhook_transactions'
      AND index_name = 'idx_telegram_msg'
  ) THEN
    ALTER TABLE upi_webhook_transactions DROP INDEX idx_telegram_msg;
  END IF;
END$$
DELIMITER ;
CALL _drop_idx_telegram_msg();
DROP PROCEDURE _drop_idx_telegram_msg;

-- Step 2: Add the composite UNIQUE index
ALTER TABLE upi_webhook_transactions
  ADD UNIQUE KEY `uk_tg_msg` (`telegram_message_id`, `telegram_chat_id`);
