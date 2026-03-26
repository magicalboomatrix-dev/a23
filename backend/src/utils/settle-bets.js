const { recordWalletTransaction } = require('./wallet-ledger');

/**
 * Settle all pending bets for a given game using the provided result string.
 * Must be called within an existing transaction (conn).
 * Returns the number of bets settled.
 */
async function settleBetsForGame(conn, gameId, resultStr, resultId) {
  const [pendingBets] = await conn.query(
    `SELECT b.*, bn.number, bn.amount as number_amount, bn.id as bn_id
     FROM bets b
     JOIN bet_numbers bn ON b.id = bn.bet_id
     WHERE b.game_id = ? AND b.status = ?`,
    [gameId, 'pending']
  );

  if (pendingBets.length === 0) return 0;

  // Get payout settings
  const [settings] = await conn.query(
    "SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'payout_%'"
  );
  const payouts = {};
  for (const s of settings) {
    payouts[s.setting_key] = parseFloat(s.setting_value);
  }

  // Group bet numbers by bet_id
  const betGroups = {};
  for (const row of pendingBets) {
    if (!betGroups[row.id]) {
      betGroups[row.id] = { ...row, numbers: [] };
    }
    betGroups[row.id].numbers.push({ number: row.number, amount: parseFloat(row.number_amount) });
  }

  const resultLastDigit = resultStr.slice(-1);
  const resultFirstDigit = resultStr.slice(0, 1);
  let settledCount = 0;

  for (const betId of Object.keys(betGroups)) {
    const bet = betGroups[betId];
    let totalWin = 0;

    for (const num of bet.numbers) {
      let isWin = false;

      if (bet.type === 'jodi') {
        isWin = num.number === resultStr;
        if (isWin) totalWin += num.amount * (payouts.payout_jodi || 90);
      } else if (bet.type === 'haruf_andar') {
        isWin = num.number === resultFirstDigit;
        if (isWin) totalWin += num.amount * (payouts.payout_haruf || 9);
      } else if (bet.type === 'haruf_bahar') {
        isWin = num.number === resultLastDigit;
        if (isWin) totalWin += num.amount * (payouts.payout_haruf || 9);
      } else if (bet.type === 'crossing') {
        isWin = num.number === resultStr;
        if (isWin) totalWin += num.amount * (payouts.payout_crossing || 90);
      }
    }

    const status = totalWin > 0 ? 'win' : 'loss';
    await conn.query(
      'UPDATE bets SET status = ?, win_amount = ?, game_result_id = ? WHERE id = ?',
      [status, totalWin, resultId, betId]
    );

    if (totalWin > 0) {
      await recordWalletTransaction(conn, {
        userId: bet.user_id,
        type: 'win',
        amount: totalWin,
        referenceType: 'bet',
        referenceId: `bet_${betId}`,
        remark: `Won on ${bet.type} bet`,
      });

      await conn.query(
        'INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)',
        [bet.user_id, 'win', `Congratulations! You won ₹${totalWin} on your ${bet.type} bet!`]
      );
    }

    settledCount++;
  }

  return settledCount;
}

module.exports = { settleBetsForGame };
