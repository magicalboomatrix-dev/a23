require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  // Step 1: Drop old non-unique index if it exists
  try {
    const [rows] = await c.query(
      `SELECT COUNT(*) as cnt FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'upi_webhook_transactions'
         AND index_name = 'idx_telegram_msg'`
    );
    if (rows[0].cnt > 0) {
      await c.query('ALTER TABLE upi_webhook_transactions DROP INDEX idx_telegram_msg');
      console.log('Dropped idx_telegram_msg');
    } else {
      console.log('idx_telegram_msg not found, skipping');
    }
  } catch (e) {
    console.log('Drop index skipped:', e.message);
  }

  // Step 2: Add composite UNIQUE index
  try {
    await c.query(
      'ALTER TABLE upi_webhook_transactions ADD UNIQUE KEY uk_tg_msg (telegram_message_id, telegram_chat_id)'
    );
    console.log('Added UNIQUE KEY uk_tg_msg (telegram_message_id, telegram_chat_id)');
  } catch (e) {
    if (e.code === 'ER_DUP_KEYNAME') {
      console.log('uk_tg_msg already exists, skipping');
    } else {
      throw e;
    }
  }

  await c.end();
  console.log('Migration 004 complete');
})();
