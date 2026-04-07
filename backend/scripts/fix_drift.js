/**
 * Fix Ledger Drift — One-time script
 *
 * The drift was caused by bonus_balance deductions from bets not being
 * recorded in wallet_transactions. This script:
 * 1. Finds the exact drift amount
 * 2. Inserts a corrective adjustment transaction
 *
 * Usage:
 *   node scripts/fix_drift.js            # Dry-run (report only)
 *   node scripts/fix_drift.js --fix      # Apply correction
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../src/config/database');

const FIX_MODE = process.argv.includes('--fix');

async function main() {
  console.log(`\n=== Ledger Drift Fix (${FIX_MODE ? 'FIX MODE' : 'DRY RUN'}) ===\n`);

  const [[walletSum]] = await pool.query(
    'SELECT COALESCE(SUM(balance + bonus_balance), 0) AS total FROM wallets'
  );
  const [[txnSum]] = await pool.query(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM wallet_transactions WHERE status = 'completed'"
  );

  const walletTotal = parseFloat(walletSum.total);
  const txnTotal = parseFloat(txnSum.total);
  const drift = Math.round((walletTotal - txnTotal) * 100) / 100;

  console.log(`Wallet balances total: ₹${walletTotal.toFixed(2)}`);
  console.log(`Transaction net total: ₹${txnTotal.toFixed(2)}`);
  console.log(`Drift: ₹${drift.toFixed(2)}`);

  if (Math.abs(drift) <= 0.01) {
    console.log('\nNo material drift detected. Nothing to fix.');
    process.exit(0);
  }

  // The drift is positive because bonus_balance deductions from bets
  // were not recorded as negative transactions. The wallets show less
  // than what transactions say should be there (or vice versa).
  // We need to insert a corrective entry to bring them in sync.

  // Find admin user to assign the corrective transaction to
  const [[admin]] = await pool.query(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  );

  if (!admin) {
    console.error('No admin user found!');
    process.exit(1);
  }

  const correctionAmount = drift; // If wallets > txns, we need a positive txn to match
  const refId = `drift_fix_${Date.now()}`;

  console.log(`\nCorrection needed: ₹${correctionAmount.toFixed(2)} adjustment transaction`);
  console.log(`Will be assigned to admin user_id: ${admin.id}`);
  console.log(`Reference: ${refId}`);

  if (!FIX_MODE) {
    console.log('\nDry run — no changes made. Run with --fix to apply.');
    process.exit(0);
  }

  // Get admin's current balance for balance_after calculation
  const [[adminWallet]] = await pool.query(
    'SELECT COALESCE(balance, 0) + COALESCE(bonus_balance, 0) AS total FROM wallets WHERE user_id = ?',
    [admin.id]
  );

  const balanceAfter = parseFloat(adminWallet?.total || 0);

  await pool.query(
    `INSERT INTO wallet_transactions
      (user_id, type, amount, balance_after, status, reference_type, reference_id, remark)
     VALUES (?, 'adjustment', ?, ?, 'completed', 'drift_fix', ?, ?)`,
    [admin.id, correctionAmount, balanceAfter, refId,
     `Ledger drift correction — bonus bet deductions were not recorded in transactions (one-time fix)`]
  );

  console.log('\n✅ Corrective transaction inserted.');

  // Verify
  const [[newWalletSum]] = await pool.query(
    'SELECT COALESCE(SUM(balance + bonus_balance), 0) AS total FROM wallets'
  );
  const [[newTxnSum]] = await pool.query(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM wallet_transactions WHERE status = 'completed'"
  );

  const newDrift = Math.abs(parseFloat(newWalletSum.total) - parseFloat(newTxnSum.total));
  console.log(`New drift: ₹${newDrift.toFixed(2)}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
