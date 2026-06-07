try {
  const dotenv = require('dotenv');
  dotenv.config({ path: require('path').resolve(__dirname, '../.env') });
} catch (err) {
  console.log('dotenv load error:', err.message);
}

const pool = require('../src/config/database');
const { getBetCreditSummary, renameBetSettlementReferences } = require('../src/utils/bet-reconciliation');

async function customReverseSettlement(conn, gameResultId) {
  // Find all bets settled against this result
  const [settledBets] = await conn.query(
    `SELECT id, user_id, win_amount, status, type
     FROM bets
     WHERE game_result_id = ? AND status IN ('win', 'loss')`,
    [gameResultId]
  );

  if (settledBets.length === 0) return { reversedCount: 0, betIds: [] };

  const revisionTs = Date.now();
  let reversedCount = 0;
  const betIds = [];

  for (const bet of settledBets) {
    if (bet.status === 'win' && parseFloat(bet.win_amount) > 0) {
      const expectedWin = parseFloat(bet.win_amount);
      const creditSummary = await getBetCreditSummary(conn, bet.id);
      const netCredited = Math.max(0, creditSummary.netCredited);

      const renamedRows = await renameBetSettlementReferences(conn, bet.id, revisionTs);

      if (netCredited > 0) {
        // Direct DB updates to bypass "Insufficient balance" check
        const [wallets] = await conn.query(
          'SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE',
          [bet.user_id]
        );
        const currentBalance = parseFloat(wallets[0].balance || 0);
        const nextBalance = Math.round((currentBalance - netCredited) * 100) / 100;

        await conn.query('UPDATE wallets SET balance = ? WHERE user_id = ?', [nextBalance, bet.user_id]);
        await conn.query(
          `INSERT INTO wallet_transactions
            (user_id, type, amount, balance_after, status, reference_type, reference_id, remark)
           VALUES (?, 'adjustment', ?, ?, 'completed', 'bet_reversal', ?, ?)`,
          [
            bet.user_id,
            -netCredited,
            nextBalance,
            `bet_reversal_${bet.id}_${revisionTs}`,
            `Result revised — reversed ${bet.type} win (${renamedRows} credit reference(s) archived)`
          ]
        );
        console.log(`Reverted winnings for User ${bet.user_id}: -₹${netCredited}. Balance: ${currentBalance} -> ${nextBalance}`);
      }
    }

    // Reset bet to pending
    await conn.query(
      `UPDATE bets SET status = 'pending', win_amount = 0, game_result_id = NULL, settled_at = NULL WHERE id = ?`,
      [bet.id]
    );

    betIds.push(bet.id);
    reversedCount++;
  }

  // Reset the game_results settled flag
  await conn.query('UPDATE game_results SET is_settled = 0 WHERE id = ?', [gameResultId]);

  return { reversedCount, betIds };
}

async function main() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    console.log('1. Reversing incorrect settlement on game_result_id = 6873 (with game 35 bets)...');
    const result = await customReverseSettlement(conn, 6873);
    console.log(`Reversed ${result.reversedCount} bets. Bet IDs:`, result.betIds);

    console.log('2. Deleting settlement_queue entry for game_result_id = 6873...');
    await conn.query('DELETE FROM settlement_queue WHERE game_result_id = 6873');

    console.log('3. Setting is_settled = 0 for game_results row 6879 (FARIDABAD)...');
    await conn.query('UPDATE game_results SET is_settled = 0 WHERE id = 6879');

    console.log('4. Deleting settlement_queue entry for game_result_id = 6879...');
    await conn.query('DELETE FROM settlement_queue WHERE game_result_id = 6879');

    console.log('5. Enqueuing correct pending settlement for game_result_id = 6873 (SHRI GANESH, result "37", date "2026-06-07")...');
    await conn.query(
      `INSERT INTO settlement_queue (game_result_id, game_id, result_number, result_date, status)
       VALUES (6873, 34, '37', '2026-06-07', 'pending')`
    );

    console.log('6. Enqueuing correct pending settlement for game_result_id = 6879 (FARIDABAD, result "88", date "2026-06-07")...');
    await conn.query(
      `INSERT INTO settlement_queue (game_result_id, game_id, result_number, result_date, status)
       VALUES (6879, 35, '88', '2026-06-07', 'pending')`
    );

    await conn.commit();
    console.log('✅ Correction transaction committed successfully!');
  } catch (err) {
    await conn.rollback();
    console.error('❌ Transaction rolled back due to error:', err);
  } finally {
    conn.release();
    await pool.end();
  }
}

main();
