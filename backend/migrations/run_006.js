require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, '006_moderator_referral_updates.sql'), 'utf8');
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    console.log('Running:', stmt.substring(0, 80) + '...');
    await pool.query(stmt);
    console.log('OK');
  }

  console.log('Migration 006 complete.');
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
