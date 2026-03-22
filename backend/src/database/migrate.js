require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  console.log('Connected to MySQL. Running migrations...');

  // Create database
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'a23satta'}\``);
  await connection.query(`USE \`${process.env.DB_NAME || 'a23satta'}\``);

  // Users table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100),
      phone VARCHAR(15) NOT NULL UNIQUE,
      password VARCHAR(255),
      mpin_hash VARCHAR(255),
      mpin_enabled TINYINT(1) DEFAULT 0,
      mpin_attempts INT DEFAULT 0,
      mpin_blocked_until TIMESTAMP NULL,
      role ENUM('admin', 'moderator', 'user') DEFAULT 'user',
      moderator_id INT DEFAULT NULL,
      referral_code VARCHAR(20) UNIQUE,
      upi_id VARCHAR(150),
      qr_code_image VARCHAR(255),
      scanner_label VARCHAR(100),
      scanner_enabled TINYINT(1) DEFAULT 1,
      is_blocked TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Add MPIN columns if they don't exist (for existing databases)
  try {
    await connection.query(`ALTER TABLE users ADD COLUMN mpin_hash VARCHAR(255) AFTER password`);
  } catch (e) { /* column already exists */ }
  try {
    await connection.query(`ALTER TABLE users ADD COLUMN mpin_enabled TINYINT(1) DEFAULT 0 AFTER mpin_hash`);
  } catch (e) { /* column already exists */ }
  try {
    await connection.query(`ALTER TABLE users ADD COLUMN mpin_attempts INT DEFAULT 0 AFTER mpin_enabled`);
  } catch (e) { /* column already exists */ }
  try {
    await connection.query(`ALTER TABLE users ADD COLUMN mpin_blocked_until TIMESTAMP NULL AFTER mpin_attempts`);
  } catch (e) { /* column already exists */ }
  try {
    await connection.query(`ALTER TABLE users ADD COLUMN upi_id VARCHAR(150) AFTER referral_code`);
  } catch (e) { /* column already exists */ }
  try {
    await connection.query(`ALTER TABLE users ADD COLUMN qr_code_image VARCHAR(255) AFTER upi_id`);
  } catch (e) { /* column already exists */ }
  try {
    await connection.query(`ALTER TABLE users ADD COLUMN scanner_label VARCHAR(100) AFTER qr_code_image`);
  } catch (e) { /* column already exists */ }
  try {
    await connection.query(`ALTER TABLE users ADD COLUMN scanner_enabled TINYINT(1) DEFAULT 1 AFTER scanner_label`);
  } catch (e) { /* column already exists */ }

  // OTP table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS otps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phone VARCHAR(15) NOT NULL,
      purpose ENUM('register', 'reset_mpin') NOT NULL DEFAULT 'register',
      otp VARCHAR(6) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      is_used TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_phone (phone),
      INDEX idx_phone_purpose (phone, purpose),
      INDEX idx_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  try {
    await connection.query("ALTER TABLE otps ADD COLUMN purpose ENUM('register', 'reset_mpin') NOT NULL DEFAULT 'register' AFTER phone");
  } catch (e) { /* column already exists */ }

  try {
    await connection.query('CREATE INDEX idx_phone_purpose ON otps (phone, purpose)');
  } catch (e) { /* index already exists */ }

  // Wallets table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS wallets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      balance DECIMAL(12, 2) DEFAULT 0.00,
      bonus_balance DECIMAL(12, 2) DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Wallet transactions table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type ENUM('deposit', 'bet', 'win', 'withdraw', 'adjustment', 'bonus', 'refund') NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      balance_after DECIMAL(12, 2) NOT NULL,
      status ENUM('pending', 'completed', 'failed') DEFAULT 'completed',
      reference_type VARCHAR(50),
      reference_id VARCHAR(100),
      remark VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_date (user_id, created_at),
      INDEX idx_type (type),
      INDEX idx_reference (reference_type, reference_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  try {
    await connection.query(`ALTER TABLE wallet_transactions MODIFY COLUMN type ENUM('deposit', 'bet', 'win', 'withdraw', 'adjustment', 'bonus', 'refund') NOT NULL`);
  } catch (e) { /* enum already updated */ }
  try {
    await connection.query(`ALTER TABLE wallet_transactions ADD COLUMN reference_type VARCHAR(50) AFTER status`);
  } catch (e) { /* column already exists */ }
  try {
    await connection.query(`CREATE INDEX idx_reference ON wallet_transactions (reference_type, reference_id)`);
  } catch (e) { /* index already exists */ }

  await connection.query(`
    UPDATE wallet_transactions
    SET reference_type = CASE
      WHEN reference_type IS NOT NULL THEN reference_type
      WHEN reference_id LIKE 'deposit_%' THEN 'deposit'
      WHEN reference_id LIKE 'bet_%' THEN 'bet'
      WHEN reference_id LIKE 'withdraw_%' THEN 'withdraw'
      ELSE 'legacy'
    END
    WHERE reference_type IS NULL
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS moderator_wallet (
      moderator_id INT PRIMARY KEY,
      balance DECIMAL(12, 2) DEFAULT 0.00,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS moderator_wallet_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      moderator_id INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      balance_after DECIMAL(12, 2) DEFAULT NULL,
      reference_id VARCHAR(100),
      remark VARCHAR(255),
      created_by INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_moderator_created (moderator_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  try {
    await connection.query(`ALTER TABLE moderator_wallet_transactions ADD COLUMN balance_after DECIMAL(12, 2) DEFAULT NULL AFTER amount`);
  } catch (e) { /* column already exists */ }
  try {
    await connection.query(`ALTER TABLE moderator_wallet_transactions ADD COLUMN remark VARCHAR(255) AFTER reference_id`);
  } catch (e) { /* column already exists */ }
  try {
    await connection.query(`ALTER TABLE moderator_wallet_transactions ADD COLUMN created_by INT DEFAULT NULL AFTER remark`);
  } catch (e) { /* column already exists */ }
  try {
    await connection.query(`ALTER TABLE moderator_wallet_transactions ADD CONSTRAINT fk_moderator_wallet_transactions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`);
  } catch (e) { /* constraint already exists */ }

  await connection.query(`
    INSERT IGNORE INTO moderator_wallet (moderator_id, balance)
    SELECT id, 0.00 FROM users WHERE role = 'moderator'
  `);

  // Games table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS games (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      open_time TIME NOT NULL,
      close_time TIME NOT NULL,
      result_time TIME DEFAULT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  try {
    await connection.query(`ALTER TABLE games ADD COLUMN result_time TIME DEFAULT NULL AFTER close_time`);
  } catch (e) { /* column already exists */ }

  await connection.query(`
    UPDATE games
    SET result_time = close_time
    WHERE result_time IS NULL
  `);

  // Game results table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS game_results (
      id INT AUTO_INCREMENT PRIMARY KEY,
      game_id INT NOT NULL,
      result_number VARCHAR(10),
      result_date DATE NOT NULL,
      declared_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      UNIQUE KEY uk_game_date (game_id, result_date),
      INDEX idx_date (result_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await connection.query(`
    ALTER TABLE game_results
    MODIFY COLUMN declared_at DATETIME NULL
  `);

  // Bets table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS bets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      game_id INT NOT NULL,
      game_result_id INT DEFAULT NULL,
      type ENUM('jodi', 'haruf_andar', 'haruf_bahar', 'crossing') NOT NULL,
      total_amount DECIMAL(12, 2) NOT NULL,
      win_amount DECIMAL(12, 2) DEFAULT 0.00,
      status ENUM('pending', 'win', 'loss') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (game_result_id) REFERENCES game_results(id) ON DELETE SET NULL,
      INDEX idx_user (user_id),
      INDEX idx_game (game_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Bet numbers table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS bet_numbers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      bet_id INT NOT NULL,
      number VARCHAR(10) NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      FOREIGN KEY (bet_id) REFERENCES bets(id) ON DELETE CASCADE,
      INDEX idx_bet (bet_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Deposits table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS deposits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      moderator_id INT DEFAULT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      utr_number VARCHAR(50) NOT NULL UNIQUE,
      screenshot VARCHAR(255),
      receipt_image VARCHAR(255),
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      approved_by INT DEFAULT NULL,
      approved_by_role ENUM('admin', 'moderator') DEFAULT NULL,
      approved_by_id INT DEFAULT NULL,
      approved_at TIMESTAMP NULL,
      reject_reason VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (approved_by_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_user (user_id),
      INDEX idx_moderator (moderator_id),
      INDEX idx_status (status),
      INDEX idx_utr (utr_number)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  try {
    await connection.query(`ALTER TABLE deposits ADD COLUMN moderator_id INT DEFAULT NULL AFTER user_id`);
  } catch (e) { /* column already exists */ }
  try {
    await connection.query(`ALTER TABLE deposits ADD COLUMN receipt_image VARCHAR(255) AFTER screenshot`);
  } catch (e) { /* column already exists */ }
  try {
    await connection.query(`ALTER TABLE deposits ADD COLUMN approved_by_role ENUM('admin', 'moderator') DEFAULT NULL AFTER approved_by`);
  } catch (e) { /* column already exists */ }
  try {
    await connection.query(`ALTER TABLE deposits ADD COLUMN approved_by_id INT DEFAULT NULL AFTER approved_by_role`);
  } catch (e) { /* column already exists */ }
  try {
    await connection.query(`ALTER TABLE deposits ADD COLUMN approved_at TIMESTAMP NULL AFTER approved_by_id`);
  } catch (e) { /* column already exists */ }
  try {
    await connection.query(`ALTER TABLE deposits ADD INDEX idx_moderator (moderator_id)`);
  } catch (e) { /* index already exists */ }

  await connection.query(`
    UPDATE deposits d
    JOIN users u ON u.id = d.user_id
    SET d.moderator_id = u.moderator_id
    WHERE d.moderator_id IS NULL
  `);
  await connection.query(`
    UPDATE deposits
    SET receipt_image = screenshot
    WHERE receipt_image IS NULL AND screenshot IS NOT NULL
  `);
  try {
    await connection.query(`ALTER TABLE deposits ADD COLUMN receipt_image_hash VARCHAR(64) AFTER receipt_image`);
  } catch (e) { /* column already exists */ }
  await connection.query(`
    UPDATE deposits
    SET approved_by_id = approved_by
    WHERE approved_by_id IS NULL AND approved_by IS NOT NULL
  `);
  await connection.query(`
    UPDATE moderator_wallet_transactions mwt
    JOIN moderator_wallet mw ON mw.moderator_id = mwt.moderator_id
    SET mwt.balance_after = mw.balance
    WHERE mwt.balance_after IS NULL
  `);

  // Bank accounts table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      account_number VARCHAR(30) NOT NULL,
      ifsc VARCHAR(11) NOT NULL,
      bank_name VARCHAR(100) NOT NULL,
      account_holder VARCHAR(100) NOT NULL,
      is_flagged TINYINT(1) DEFAULT 0,
      flag_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user (user_id),
      INDEX idx_account (account_number)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Withdraw requests table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS withdraw_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      bank_id INT NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      approved_by INT DEFAULT NULL,
      reject_reason VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (bank_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_user (user_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Bonuses table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS bonuses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type ENUM('first_deposit', 'slab', 'referral') NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      reference_id VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Referrals table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS referrals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      referrer_id INT NOT NULL,
      referred_user_id INT NOT NULL UNIQUE,
      bonus_amount DECIMAL(12, 2) DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // System settings table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(100) NOT NULL UNIQUE,
      setting_value TEXT NOT NULL,
      description VARCHAR(255),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const defaultSettings = [
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

  for (const [key, value, description] of defaultSettings) {
    await connection.query(
      'INSERT IGNORE INTO settings (setting_key, setting_value, description) VALUES (?, ?, ?)',
      [key, value, description]
    );
  }

  await connection.query(
    "UPDATE settings SET description = 'Max bet amount 15-30 min before close' WHERE setting_key = 'max_bet_15min'"
  );
  await connection.query(
    "UPDATE settings SET description = 'Max bet amount in the last 15 min before close' WHERE setting_key = 'max_bet_last_15min'"
  );

  // Notifications table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      type ENUM('win', 'deposit', 'withdraw', 'system') NOT NULL,
      message VARCHAR(500) NOT NULL,
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user (user_id),
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS moderator_scanner_audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      moderator_id INT NOT NULL,
      actor_id INT DEFAULT NULL,
      actor_role VARCHAR(20) DEFAULT NULL,
      field_name VARCHAR(50) NOT NULL,
      old_value VARCHAR(255) DEFAULT NULL,
      new_value VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_moderator_created (moderator_id, created_at),
      INDEX idx_field_name (field_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS utr_attempt_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      attempt_user_id INT NOT NULL,
      utr VARCHAR(50) NOT NULL,
      original_user_id INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (attempt_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (original_user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_attempt_user (attempt_user_id),
      INDEX idx_utr (utr),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log('All tables created successfully!');
  await connection.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
