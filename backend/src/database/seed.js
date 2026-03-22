require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

function generateReferralCode() {
  return 'A23' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'a23satta',
  });

  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  await connection.query(`
    INSERT IGNORE INTO users (name, phone, password, role, referral_code)
    VALUES ('Admin', '9999999999', ?, 'admin', ?)
  `, [adminPassword, generateReferralCode()]);

  // Create moderator
  const modPassword = await bcrypt.hash('mod123', 10);
  await connection.query(`
    INSERT IGNORE INTO users (name, phone, password, role, referral_code)
    VALUES ('Moderator1', '8888888888', ?, 'moderator', ?)
  `, [modPassword, generateReferralCode()]);

  // Create wallets for admin and moderator
  const [users] = await connection.query('SELECT id FROM users');
  for (const user of users) {
    await connection.query(`
      INSERT IGNORE INTO wallets (user_id, balance, bonus_balance)
      VALUES (?, 0.00, 0.00)
    `, [user.id]);
  }

  // Seed games
  const games = [
    ['DISAWAR', '05:00:00', '02:00:00'],
    ['DELHI BAZAR', '10:00:00', '17:00:00'],
    ['SHRI GANESH', '11:00:00', '18:00:00'],
    ['FARIDABAD', '18:00:00', '21:00:00'],
    ['GHAZIABAD', '20:00:00', '22:00:00'],
    ['GALI', '23:00:00', '01:00:00'],
  ];

  for (const [name, openTime, closeTime] of games) {
    await connection.query(`
      INSERT IGNORE INTO games (name, open_time, close_time)
      VALUES (?, ?, ?)
    `, [name, openTime, closeTime]);
  }

  // Seed default settings
  const settings = [
    ['payout_jodi', '90', 'Payout multiplier for Jodi bets'],
    ['payout_haruf', '9', 'Payout multiplier for Haruf bets'],
    ['payout_crossing', '90', 'Payout multiplier for Crossing bets'],
    ['max_bet_60min', '10000', 'Max bet amount when 60+ min before close'],
    ['max_bet_30min', '5000', 'Max bet amount 30-60 min before close'],
    ['max_bet_15min', '1000', 'Max bet amount 15-30 min before close'],
    ['max_bet_last_15min', '500', 'Max bet amount in the last 15 min before close'],
    ['min_bet', '10', 'Minimum bet amount'],
    ['min_deposit', '100', 'Minimum deposit amount'],
    ['min_withdraw', '200', 'Minimum withdrawal amount'],
    ['first_deposit_bonus_percent', '10', 'First deposit bonus percentage'],
    ['bonus_slab_2500', '100', 'Bonus for deposit of 2500'],
    ['bonus_slab_5000', '250', 'Bonus for deposit of 5000'],
    ['bonus_slab_10000', '500', 'Bonus for deposit of 10000'],
    ['referral_bonus', '50', 'Referral bonus amount'],
    ['max_withdraw_time_minutes', '45', 'Maximum withdrawal processing time'],
  ];

  for (const [key, value, desc] of settings) {
    await connection.query(`
      INSERT IGNORE INTO settings (setting_key, setting_value, description)
      VALUES (?, ?, ?)
    `, [key, value, desc]);
  }

  console.log('Seed data inserted successfully!');
  await connection.end();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
