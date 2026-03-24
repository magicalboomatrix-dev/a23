/**
 * Smoke Seed — comprehensive demo data for UI smoke testing
 * Populates: users, wallets, deposits, bets, withdrawals, notifications,
 *             game results, bonuses, referrals, moderator wallets.
 *
 * Run: node src/scripts/smoke-seed.js
 * Safe to re-run (idempotent via INSERT IGNORE / duplicate-check).
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// ─── helpers ─────────────────────────────────────────────────────────────────

function rcode() {
  return 'A23' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function tsAgo(days, hours = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST || 'localhost',
    port:     process.env.DB_PORT || 3306,
    user:     process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'a23satta',
    multipleStatements: false,
  });

  console.log('Connected. Starting smoke seed…\n');

  // ── 1. Admin & Moderator ───────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 10);
  const modHash   = await bcrypt.hash('mod123', 10);

  await conn.query(`INSERT IGNORE INTO users (name, phone, password, role, referral_code)
    VALUES ('Admin', '9999999999', ?, 'admin', ?)`, [adminHash, rcode()]);
  await conn.query(`INSERT IGNORE INTO users (name, phone, password, role, referral_code, upi_id, scanner_label, scanner_enabled)
    VALUES ('Moderator1', '8888888888', ?, 'moderator', ?, 'mod1pay@upi', 'MOD1 Scanner', 1)`, [modHash, rcode()]);

  const [[admin]] = await conn.query(`SELECT id FROM users WHERE phone='9999999999'`);
  const [[mod]]   = await conn.query(`SELECT id FROM users WHERE phone='8888888888'`);
  const adminId = admin.id;
  const modId   = mod.id;

  // Ensure moderator_wallet row
  await conn.query(`INSERT IGNORE INTO moderator_wallet (moderator_id, balance) VALUES (?, 15000.00)`, [modId]);
  await conn.query(`UPDATE moderator_wallet SET balance = 15000.00 WHERE moderator_id = ?`, [modId]);

  // ── 2. Regular users ──────────────────────────────────────────────────────
  const userPass = await bcrypt.hash('user123', 10);
  const usersData = [
    { name: 'Rahul Sharma',  phone: '7777777771' },
    { name: 'Priya Singh',   phone: '7777777772' },
    { name: 'Amit Verma',    phone: '7777777773' },
    { name: 'Sunita Patel',  phone: '7777777774' },
    { name: 'Vikram Yadav',  phone: '7777777775' },
    { name: 'Kavita Nair',   phone: '7777777776' },
    { name: 'Deepak Gupta',  phone: '7777777777' },
    { name: 'Anjali Mehta',  phone: '7777777778' },
  ];

  for (const u of usersData) {
    await conn.query(`INSERT IGNORE INTO users (name, phone, password, role, referral_code, moderator_id)
      VALUES (?, ?, ?, 'user', ?, ?)`, [u.name, u.phone, userPass, rcode(), modId]);
  }

  // Fetch user ids
  const [allUsers] = await conn.query(`SELECT id, name, phone FROM users WHERE role='user' ORDER BY id`);
  // Map phone → id
  const uid = {};
  for (const u of allUsers) uid[u.phone] = u.id;

  // ── 3. Wallets ────────────────────────────────────────────────────────────
  const walletBalances = {
    '7777777771': [8500.00,  200.00],
    '7777777772': [12300.00, 500.00],
    '7777777773': [450.00,   0.00],
    '7777777774': [22000.00, 1000.00],
    '7777777775': [1200.00,  150.00],
    '7777777776': [5700.00,  0.00],
    '7777777777': [0.00,     0.00],
    '7777777778': [3300.00,  300.00],
  };
  for (const [phone, [bal, bonus]] of Object.entries(walletBalances)) {
    const userId = uid[phone];
    if (!userId) continue;
    await conn.query(`INSERT INTO wallets (user_id, balance, bonus_balance)
      VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE balance=VALUES(balance), bonus_balance=VALUES(bonus_balance)`,
      [userId, bal, bonus]);
  }
  // Admin & mod wallets
  await conn.query(`INSERT INTO wallets (user_id, balance, bonus_balance) VALUES (?,0,0) ON DUPLICATE KEY UPDATE balance=balance`, [adminId]);
  await conn.query(`INSERT INTO wallets (user_id, balance, bonus_balance) VALUES (?,0,0) ON DUPLICATE KEY UPDATE balance=balance`, [modId]);

  // ── 4. Games ──────────────────────────────────────────────────────────────
  const gamesData = [
    ['DISAWAR',     '05:00:00', '02:00:00', '05:00:00'],
    ['DELHI BAZAR', '10:00:00', '17:00:00', '17:00:00'],
    ['SHRI GANESH', '11:00:00', '18:00:00', '18:00:00'],
    ['FARIDABAD',   '14:00:00', '18:30:00', '18:30:00'],
    ['GHAZIABAD',   '20:00:00', '22:00:00', '22:00:00'],
    ['GALI',        '23:00:00', '01:00:00', '01:00:00'],
  ];
  for (const [name, open, close, result] of gamesData) {
    await conn.query(`INSERT IGNORE INTO games (name, open_time, close_time, result_time)
      VALUES (?, ?, ?, ?)`, [name, open, close, result]);
  }

  const [games] = await conn.query(`SELECT id, name FROM games WHERE is_active=1 ORDER BY id`);

  // ── 5. Game results (last 7 days) ─────────────────────────────────────────
  const today = daysAgo(0);
  for (const game of games) {
    for (let d = 0; d <= 6; d++) {
      const date  = daysAgo(d);
      const num   = String((game.id * 17 + d * 13) % 100).padStart(2, '0');
      await conn.query(`INSERT IGNORE INTO game_results (game_id, result_number, result_date, declared_at)
        VALUES (?, ?, ?, ?)`, [game.id, num, date, `${date} 22:00:00`]);
    }
  }

  // Fetch today's results
  const [todayResults] = await conn.query(
    `SELECT id, game_id FROM game_results WHERE result_date = ?`, [today]);
  const resultByGame = {};
  for (const r of todayResults) resultByGame[r.game_id] = r.id;

  // ── 6. Deposits ───────────────────────────────────────────────────────────
  const deposits = [
    // [phone, amount, utr, status, daysAgo, hoursAgo]
    ['7777777771', 5000,  'UTR10000000001', 'approved', 6, 0],
    ['7777777771', 3000,  'UTR10000000002', 'approved', 3, 0],
    ['7777777771', 1000,  'UTR10000000003', 'pending',  0, 2],
    ['7777777772', 10000, 'UTR10000000004', 'approved', 5, 0],
    ['7777777772', 2500,  'UTR10000000005', 'pending',  0, 1],
    ['7777777773', 500,   'UTR10000000006', 'rejected', 4, 0],
    ['7777777773', 1500,  'UTR10000000007', 'approved', 2, 0],
    ['7777777774', 20000, 'UTR10000000008', 'approved', 7, 0],
    ['7777777774', 5000,  'UTR10000000009', 'approved', 1, 0],
    ['7777777775', 2000,  'UTR10000000010', 'approved', 3, 0],
    ['7777777776', 8000,  'UTR10000000011', 'approved', 4, 0],
    ['7777777776', 500,   'UTR10000000012', 'pending',  0, 3],
    ['7777777777', 1000,  'UTR10000000013', 'rejected', 2, 0],
    ['7777777778', 5000,  'UTR10000000014', 'approved', 5, 0],
    ['7777777778', 2000,  'UTR10000000015', 'pending',  0, 4],
  ];

  const depositIds = {};
  for (const [phone, amount, utr, status, dAgo, hAgo] of deposits) {
    const userId = uid[phone];
    if (!userId) continue;
    const createdAt  = tsAgo(dAgo, hAgo);
    const approvedBy = status === 'approved' ? adminId : null;
    const rejectReason = status === 'rejected' ? 'UTR not found in bank statement' : null;
    try {
      const [res] = await conn.query(
        `INSERT IGNORE INTO deposits
           (user_id, moderator_id, amount, utr_number, status, approved_by, approved_by_role,
            approved_by_id, approved_at, reject_reason, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, modId, amount, utr, status, approvedBy,
         approvedBy ? 'admin' : null, approvedBy, approvedBy ? createdAt : null,
         rejectReason, createdAt, createdAt]);
      if (res.insertId) depositIds[utr] = res.insertId;
    } catch (e) {
      // duplicate UTR — already seeded
    }
  }

  // ── 7. Deposit wallet transactions ────────────────────────────────────────
  const approvedDeposits = deposits.filter(d => d[3] === 'approved');
  let running = {};
  for (const [phone, amount, utr, , dAgo, hAgo] of approvedDeposits) {
    const userId = uid[phone];
    if (!userId) continue;
    if (!running[userId]) {
      const [[w]] = await conn.query(`SELECT balance FROM wallets WHERE user_id=?`, [userId]);
      running[userId] = parseFloat(w?.balance || 0);
    }
    const balAfter = running[userId];
    await conn.query(
      `INSERT IGNORE INTO wallet_transactions
         (user_id, type, amount, balance_after, status, reference_type, reference_id, remark, created_at)
       VALUES (?, 'deposit', ?, ?, 'completed', 'deposit', ?, ?, ?)`,
      [userId, amount, balAfter, `deposit_${utr}`, `Deposit approved - UTR ${utr}`, tsAgo(dAgo, hAgo)]);
  }

  // ── 8. Bets ───────────────────────────────────────────────────────────────
  if (games.length === 0) {
    console.warn('No games found — skipping bets.');
  } else {
    const gameId1 = games[0].id;
    const gameId2 = games[1] ? games[1].id : games[0].id;
    const gameId3 = games[2] ? games[2].id : games[0].id;
    const resId1  = resultByGame[gameId1] || null;
    const resId2  = resultByGame[gameId2] || null;

    const betsData = [
      // [phone, gameId, resultId, type, total, winAmt, status, dayAgo]
      [uid['7777777771'], gameId1, resId1, 'jodi',        500,  45000, 'win',     0],
      [uid['7777777771'], gameId2, resId2, 'haruf_andar', 200,  1800,  'win',     0],
      [uid['7777777771'], gameId1, resId1, 'crossing',    300,  0,     'loss',    0],
      [uid['7777777771'], gameId3, null,   'jodi',        400,  0,     'pending', 0],

      [uid['7777777772'], gameId1, resId1, 'jodi',        1000, 90000, 'win',     0],
      [uid['7777777772'], gameId2, resId2, 'haruf_bahar', 500,  0,     'loss',    0],
      [uid['7777777772'], gameId3, null,   'crossing',    200,  0,     'pending', 0],

      [uid['7777777773'], gameId2, resId2, 'jodi',        100,  0,     'loss',    0],
      [uid['7777777773'], gameId1, resId1, 'haruf_andar', 50,   450,   'win',     0],

      [uid['7777777774'], gameId1, resId1, 'jodi',        2000, 180000,'win',     0],
      [uid['7777777774'], gameId2, resId2, 'crossing',    500,  0,     'loss',    0],
      [uid['7777777774'], gameId3, null,   'jodi',        1000, 0,     'pending', 0],

      [uid['7777777775'], gameId2, resId2, 'haruf_andar', 100,  900,   'win',     0],
      [uid['7777777775'], gameId1, resId1, 'jodi',        200,  0,     'loss',    0],

      [uid['7777777776'], gameId3, null,   'jodi',        500,  0,     'pending', 0],
      [uid['7777777776'], gameId1, resId1, 'haruf_bahar', 300,  2700,  'win',     0],

      [uid['7777777778'], gameId2, resId2, 'jodi',        400,  36000, 'win',     0],
      [uid['7777777778'], gameId1, resId1, 'crossing',    200,  0,     'loss',    0],
    ];

    for (const [userId, gameId, resultId, type, total, winAmt, status] of betsData) {
      if (!userId) continue;
      const [betRes] = await conn.query(
        `INSERT INTO bets (user_id, game_id, game_result_id, type, total_amount, win_amount, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [userId, gameId, resultId, type, total, winAmt, status]);
      const betId = betRes.insertId;

      // Insert bet_numbers
      if (type === 'jodi') {
        const num = String((betId * 7) % 100).padStart(2, '0');
        await conn.query(`INSERT INTO bet_numbers (bet_id, number, amount) VALUES (?, ?, ?)`,
          [betId, num, total]);
      } else if (type === 'haruf_andar' || type === 'haruf_bahar') {
        const num = String(betId % 10);
        await conn.query(`INSERT INTO bet_numbers (bet_id, number, amount) VALUES (?, ?, ?)`,
          [betId, num, total]);
      } else if (type === 'crossing') {
        const n1 = String((betId * 3) % 100).padStart(2, '0');
        const n2 = String((betId * 5) % 100).padStart(2, '0');
        const half = total / 2;
        await conn.query(`INSERT INTO bet_numbers (bet_id, number, amount) VALUES (?, ?, ?),(?, ?, ?)`,
          [betId, n1, half, betId, n2, half]);
      }

      // Wallet transaction for bet debit
      await conn.query(
        `INSERT INTO wallet_transactions
           (user_id, type, amount, balance_after, status, reference_type, reference_id, remark, created_at)
         VALUES (?, 'bet', ?, 0, 'completed', 'bet', ?, ?, NOW())`,
        [userId, -total, `bet_${betId}`, `${type} bet`]);

      // Wallet transaction for win credit
      if (status === 'win' && winAmt > 0) {
        await conn.query(
          `INSERT INTO wallet_transactions
             (user_id, type, amount, balance_after, status, reference_type, reference_id, remark, created_at)
           VALUES (?, 'win', ?, 0, 'completed', 'bet', ?, ?, NOW())`,
          [userId, winAmt, `bet_${betId}`, `Win on ${type} bet`]);
      }
    }
  }

  // ── 9. Bank accounts ──────────────────────────────────────────────────────
  const bankData = [
    ['7777777771', '123456789012', 'HDFC0001234', 'HDFC Bank',   'Rahul Sharma'],
    ['7777777772', '234567890123', 'ICIC0001234', 'ICICI Bank',  'Priya Singh'],
    ['7777777773', '345678901234', 'SBIN0001234', 'SBI',         'Amit Verma'],
    ['7777777774', '456789012345', 'AXIS0001234', 'Axis Bank',   'Sunita Patel'],
    ['7777777775', '567890123456', 'PUNB0001234', 'PNB',         'Vikram Yadav'],
    ['7777777776', '678901234567', 'BARB0001234', 'Bank of Baroda','Kavita Nair'],
    ['7777777778', '789012345678', 'HDFC0005678', 'HDFC Bank',   'Anjali Mehta'],
  ];

  const bankIds = {};
  for (const [phone, acno, ifsc, bankName, holder] of bankData) {
    const userId = uid[phone];
    if (!userId) continue;
    // Check if already exists
    const [[existing]] = await conn.query(
      `SELECT id FROM bank_accounts WHERE user_id=? AND account_number=?`, [userId, acno]);
    if (existing) {
      bankIds[phone] = existing.id;
    } else {
      const [r] = await conn.query(
        `INSERT INTO bank_accounts (user_id, account_number, ifsc, bank_name, account_holder)
         VALUES (?, ?, ?, ?, ?)`, [userId, acno, ifsc, bankName, holder]);
      bankIds[phone] = r.insertId;
    }
  }

  // ── 10. Withdrawals ───────────────────────────────────────────────────────
  const withdrawals = [
    ['7777777771', 2000, 'approved', 2],
    ['7777777772', 5000, 'approved', 3],
    ['7777777773', 500,  'rejected', 1],
    ['7777777774', 10000,'approved', 4],
    ['7777777775', 800,  'pending',  0],
    ['7777777776', 3000, 'approved', 2],
    ['7777777778', 1500, 'pending',  0],
    ['7777777771', 1000, 'pending',  0],
  ];

  for (const [phone, amount, status, dAgo] of withdrawals) {
    const userId = uid[phone];
    const bankId = bankIds[phone];
    if (!userId || !bankId) continue;
    const approvedBy   = status === 'approved' ? adminId : null;
    const rejectReason = status === 'rejected'  ? 'Insufficient KYC' : null;
    await conn.query(
      `INSERT INTO withdraw_requests
         (user_id, bank_id, amount, status, approved_by, reject_reason, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, bankId, amount, status, approvedBy, rejectReason, tsAgo(dAgo), tsAgo(dAgo)]);
  }

  // ── 11. Bonuses ───────────────────────────────────────────────────────────
  const bonuses = [
    ['7777777771', 'first_deposit', 500,  'dep_first_771'],
    ['7777777772', 'first_deposit', 1000, 'dep_first_772'],
    ['7777777773', 'slab',          100,  'slab_773'],
    ['7777777774', 'slab',          500,  'slab_774'],
    ['7777777775', 'referral',      50,   'ref_775'],
    ['7777777776', 'first_deposit', 800,  'dep_first_776'],
    ['7777777778', 'slab',          250,  'slab_778'],
  ];

  for (const [phone, type, amount, ref] of bonuses) {
    const userId = uid[phone];
    if (!userId) continue;
    await conn.query(`INSERT IGNORE INTO bonuses (user_id, type, amount, reference_id)
      VALUES (?, ?, ?, ?)`, [userId, type, amount, ref]);
  }

  // ── 12. Referrals ─────────────────────────────────────────────────────────
  const referrals = [
    ['7777777771', '7777777773'],
    ['7777777771', '7777777775'],
    ['7777777772', '7777777776'],
    ['7777777774', '7777777778'],
  ];
  for (const [referrerPhone, referredPhone] of referrals) {
    const referrerId = uid[referrerPhone];
    const referredId = uid[referredPhone];
    if (!referrerId || !referredId) continue;
    await conn.query(`INSERT IGNORE INTO referrals (referrer_id, referred_user_id, bonus_amount)
      VALUES (?, ?, 50.00)`, [referrerId, referredId]);
  }

  // ── 13. Notifications ─────────────────────────────────────────────────────
  const notifs = [
    ['7777777771', 'win',     'Congratulations! You won ₹45,000 on DISAWAR Jodi bet!'],
    ['7777777771', 'deposit', 'Your deposit of ₹5,000 has been approved.'],
    ['7777777772', 'win',     'Congratulations! You won ₹90,000 on DISAWAR Jodi bet!'],
    ['7777777772', 'deposit', 'Your deposit of ₹10,000 has been approved.'],
    ['7777777774', 'win',     'Congratulations! You won ₹1,80,000 on DISAWAR Jodi bet!'],
    ['7777777774', 'withdraw','Your withdrawal of ₹10,000 has been approved.'],
    ['7777777773', 'deposit', 'Your deposit of ₹500 has been rejected. Reason: UTR not found.'],
    ['7777777775', 'win',     'Congratulations! You won ₹900 on DELHI BAZAR Haruf bet!'],
    ['7777777776', 'win',     'Congratulations! You won ₹2,700 on DISAWAR Haruf bet!'],
    ['7777777778', 'win',     'Congratulations! You won ₹36,000 on DELHI BAZAR Jodi bet!'],
    [null,         'system',  'Server maintenance scheduled for Sunday 2:00 AM - 4:00 AM IST.'],
    [null,         'system',  'New game FARIDABAD added. Bet now!'],
  ];

  for (const [phone, type, message] of notifs) {
    const userId = phone ? uid[phone] : null;
    await conn.query(`INSERT INTO notifications (user_id, type, message, is_read) VALUES (?, ?, ?, 0)`,
      [userId, type, message]);
  }

  // ── 14. Moderator wallet transactions ────────────────────────────────────
  const modTxns = [
    ['credit', 5000,  15000, 'Float top-up by admin',    adminId],
    ['credit', 5000,  10000, 'Float top-up by admin',    adminId],
    ['credit', 5000,  5000,  'Initial float allocation', adminId],
    ['debit',  2500,  12500, 'User deposit approved',    modId],
    ['debit',  1500,  13500, 'User deposit approved',    modId],
  ];
  for (const [type, amount, balAfter, remark, createdBy] of modTxns) {
    await conn.query(`INSERT INTO moderator_wallet_transactions
        (moderator_id, type, amount, balance_after, remark, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [modId, type, amount, balAfter, remark, createdBy]);
  }

  // ── 15. Fraud / UTR attempt logs ─────────────────────────────────────────
  const [utrLogExists] = await conn.query(`SHOW TABLES LIKE 'utr_attempt_logs'`);
  if (utrLogExists.length > 0) {
    const utrAttempts = [
      ['7777777773', 'UTR99999FAKE01', '192.168.1.101', null, 'not_found'],
      ['7777777777', 'UTR99999FAKE02', '10.0.0.55',     null, 'not_found'],
      ['7777777773', 'UTR10000000001', '192.168.1.101', 1,    'already_used'],
    ];
    for (const [phone, utr, ip, depositId, reason] of utrAttempts) {
      const userId = uid[phone];
      if (!userId) continue;
      // Check what columns the table has
      const [cols] = await conn.query(`SHOW COLUMNS FROM utr_attempt_logs`);
      const colNames = cols.map(c => c.Field);
      if (colNames.includes('user_id') && colNames.includes('utr_number')) {
        try {
          await conn.query(`INSERT INTO utr_attempt_logs (user_id, utr_number, ip_address, deposit_id, failure_reason)
            VALUES (?, ?, ?, ?, ?)`, [userId, utr, ip, depositId, reason]);
        } catch (e) { /* skip */ }
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const [[{ userCount }]]  = await conn.query(`SELECT COUNT(*) AS userCount FROM users WHERE role='user'`);
  const [[{ depCount }]]   = await conn.query(`SELECT COUNT(*) AS depCount FROM deposits`);
  const [[{ betCount }]]   = await conn.query(`SELECT COUNT(*) AS betCount FROM bets`);
  const [[{ wdCount }]]    = await conn.query(`SELECT COUNT(*) AS wdCount FROM withdraw_requests`);
  const [[{ notifCount }]] = await conn.query(`SELECT COUNT(*) AS notifCount FROM notifications`);
  const [[{ resCount }]]   = await conn.query(`SELECT COUNT(*) AS resCount FROM game_results`);

  console.log('─────────────────────────────────────────');
  console.log('  Smoke seed complete!');
  console.log(`  Users (regular):   ${userCount}`);
  console.log(`  Game results:      ${resCount}`);
  console.log(`  Deposits:          ${depCount}`);
  console.log(`  Bets:              ${betCount}`);
  console.log(`  Withdrawals:       ${wdCount}`);
  console.log(`  Notifications:     ${notifCount}`);
  console.log('─────────────────────────────────────────');
  console.log('\nTest credentials:');
  console.log('  Admin      → phone: 9999999999  pass: admin123');
  console.log('  Moderator  → phone: 8888888888  pass: mod123');
  console.log('  User       → phone: 7777777771  pass: user123');

  await conn.end();
}

main().catch((err) => {
  console.error('Smoke seed failed:', err.message);
  process.exit(1);
});
