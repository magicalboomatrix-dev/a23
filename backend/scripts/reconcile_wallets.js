/**
 * Wallet Reconciliation Script
 *
 * Compares wallets.balance against the calculated balance from wallet_transactions
 * to detect ledger drift. Run periodically (e.g., daily cron) or on demand.
 *
 * Usage:
 *   node scripts/reconcile_wallets.js            # Dry-run (report only)
 *   node scripts/reconcile_wallets.js --fix      # Auto-correct drifted balances
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../src/config/database');

const FIX_MODE = process.argv.includes('--fix');

async function reconcile() {
  console.log(`\n=== Wallet Reconciliation (${FIX_MODE ? 'FIX MODE' : 'DRY RUN'}) ===\n`);

  // Compute expected balance per user from wallet_transactions.
  // Credits: deposit, win, bonus, refund, adjustment (positive amounts)
  // Debits: bet, withdraw (negative amounts stored as positive — type determines sign)
  //
  // wallet_transactions.amount is always positive, and the direction is determined
  // by the type. However, recordWalletTransaction stores the signed amount directly
  // (positive for credits, negative for debits). So we just SUM(amount).
  const [rows] = await pool.query(`
    SELECT
      w.user_id,
      w.balance       AS stored_balance,
      w.bonus_balance AS stored_bonus,
      COALESCE(wt.calculated, 0) AS calculated_balance
    FROM wallets w
    LEFT JOIN (
      SELECT user_id, SUM(amount) AS calculated
      FROM wallet_transactions
      WHERE status = 'completed'
      GROUP BY user_id
    ) wt ON wt.user_id = w.user_id
  `);

  let driftCount = 0;
  const drifted = [];

  for (const row of rows) {
    const stored = parseFloat(row.stored_balance || 0);
    const calculated = parseFloat(row.calculated_balance || 0);
    // Round to 2 decimal places to avoid floating-point noise
    const diff = Math.round((stored - calculated) * 100) / 100;

    if (Math.abs(diff) >= 0.01) {
      driftCount++;
      drifted.push({
        user_id: row.user_id,
        stored_balance: stored,
        calculated_balance: calculated,
        drift: diff,
      });
    }
  }

  if (drifted.length === 0) {
    console.log(`✅ All ${rows.length} wallets are consistent. No drift detected.\n`);
    process.exit(0);
  }

  console.log(`⚠️  ${driftCount} wallet(s) with balance drift:\n`);
  console.table(drifted);

  if (!FIX_MODE) {
    console.log('\nRun with --fix to auto-correct these balances.');
    console.log('A correction wallet_transaction will be inserted for each drifted wallet.\n');
    process.exit(1);
  }

  // Fix mode — correct each drifted wallet inside a transaction
  const conn = await pool.getConnection();
  let fixed = 0;

  for (const d of drifted) {
    try {
      await conn.beginTransaction();

      // Lock the wallet row
      const [[wallet]] = await conn.query(
        'SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE',
        [d.user_id]
      );

      if (!wallet) {
        await conn.rollback();
        continue;
      }

      const currentBalance = parseFloat(wallet.balance || 0);
      const correctionAmount = Math.round((d.calculated_balance - currentBalance) * 100) / 100;

      if (Math.abs(correctionAmount) < 0.01) {
        // Drift resolved between detection and fix (concurrent transaction)
        await conn.rollback();
        continue;
      }

      const newBalance = Math.round((currentBalance + correctionAmount) * 100) / 100;

      await conn.query('UPDATE wallets SET balance = ? WHERE user_id = ?', [newBalance, d.user_id]);

      await conn.query(
        `INSERT INTO wallet_transactions
          (user_id, type, amount, balance_after, status, reference_type, reference_id, remark)
         VALUES (?, 'adjustment', ?, ?, 'completed', 'reconciliation', ?, ?)`,
        [
          d.user_id,
          correctionAmount,
          newBalance,
          `reconciliation_${d.user_id}_${Date.now()}`,
          `Reconciliation correction: drift of ${d.drift}`,
        ]
      );

      await conn.commit();
      fixed++;
      console.log(`  Fixed user #${d.user_id}: ${currentBalance} → ${newBalance} (correction: ${correctionAmount})`);
    } catch (err) {
      await conn.rollback();
      console.error(`  Error fixing user #${d.user_id}:`, err.message);
    }
  }

  conn.release();
  console.log(`\n✅ Fixed ${fixed}/${driftCount} wallets.\n`);
  process.exit(fixed === driftCount ? 0 : 1);
}

reconcile()
  .catch((err) => {
    console.error('Reconciliation failed:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
