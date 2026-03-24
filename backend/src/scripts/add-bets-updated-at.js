/**
 * Migration: Add updated_at column to bets table
 * Run: node src/scripts/add-bets-updated-at.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const pool = require('../config/database');

async function run() {
  const conn = await pool.getConnection();
  try {
    // Check if column already exists
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'bets'
         AND COLUMN_NAME = 'updated_at'`
    );

    if (cols.length > 0) {
      console.log('Column bets.updated_at already exists — nothing to do.');
      return;
    }

    await conn.query(
      `ALTER TABLE bets
       ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP
                             AFTER created_at`
    );

    // Back-fill existing rows so updated_at matches created_at
    const [result] = await conn.query(
      `UPDATE bets SET updated_at = created_at WHERE updated_at IS NULL`
    );

    console.log(`Migration complete. updated_at added to bets table. Rows back-filled: ${result.affectedRows}`);
  } finally {
    conn.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
