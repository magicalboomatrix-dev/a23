const pool = require('../config/database');

exports.listGames = async (req, res, next) => {
  try {
    const [games] = await pool.query(`
      SELECT g.*, gr.result_number, gr.result_date
      FROM games g
      LEFT JOIN game_results gr ON gr.id = (
        SELECT gr2.id
        FROM game_results gr2
        WHERE gr2.game_id = g.id
          AND gr2.declared_at IS NOT NULL
          AND gr2.declared_at >= CURDATE()
          AND gr2.declared_at < CURDATE() + INTERVAL 1 DAY
        ORDER BY gr2.declared_at DESC
        LIMIT 1
      )
      WHERE g.is_active = 1
      ORDER BY g.open_time
    `);
    res.json({ games });
  } catch (error) {
    next(error);
  }
};

exports.getGameInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [games] = await pool.query('SELECT * FROM games WHERE id = ?', [id]);
    if (games.length === 0) {
      return res.status(404).json({ error: 'Game not found.' });
    }

    // Get the most recent result history using declaration timestamps.
    const [results] = await pool.query(`
      SELECT result_number, result_date, declared_at
      FROM game_results
      WHERE game_id = ?
        AND declared_at IS NOT NULL
      ORDER BY declared_at DESC
      LIMIT 10
    `, [id]);

    res.json({ game: games[0], results });
  } catch (error) {
    next(error);
  }
};

exports.createGame = async (req, res, next) => {
  try {
    const { name, open_time, close_time } = req.body;
    if (!name || !open_time || !close_time) {
      return res.status(400).json({ error: 'Name, open_time, and close_time are required.' });
    }

    const [result] = await pool.query(
      'INSERT INTO games (name, open_time, close_time) VALUES (?, ?, ?)',
      [name, open_time, close_time]
    );

    res.status(201).json({ message: 'Game created.', id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Game already exists — try a different name.' });
    }
    next(error);
  }
};

exports.updateGame = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, open_time, close_time, is_active } = req.body;

    const fields = [];
    const values = [];

    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (open_time !== undefined) { fields.push('open_time = ?'); values.push(open_time); }
    if (close_time !== undefined) { fields.push('close_time = ?'); values.push(close_time); }
    if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    values.push(id);
    await pool.query(`UPDATE games SET ${fields.join(', ')} WHERE id = ?`, values);

    res.json({ message: 'Game updated.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Game already exists — try a different name.' });
    }
    next(error);
  }
};

exports.declareResult = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { result_number, result_date } = req.body;

    if (!result_number || !result_date) {
      return res.status(400).json({ error: 'Result number and date are required.' });
    }

    // Validate result_number is a 2-digit number (00-99)
    const resultStr = result_number.toString().padStart(2, '0');
    if (!/^\d{2}$/.test(resultStr)) {
      return res.status(400).json({ error: 'Result number must be a 2-digit number (00-99).' });
    }

    await conn.beginTransaction();

    // Insert or update result
    const [existing] = await conn.query(
      'SELECT id FROM game_results WHERE game_id = ? AND result_date = ?',
      [id, result_date]
    );

    let resultId;
    if (existing.length > 0) {
      resultId = existing[0].id;
      await conn.query(
        'UPDATE game_results SET result_number = ?, declared_at = NOW() WHERE id = ?',
        [resultStr, resultId]
      );
    } else {
      const [ins] = await conn.query(
        'INSERT INTO game_results (game_id, result_number, result_date, declared_at) VALUES (?, ?, ?, NOW())',
        [id, resultStr, result_date]
      );
      resultId = ins.insertId;
    }

    // Settle bets — settle all pending bets for this game
    // Previous day's bets should already be settled; using game_id + pending status is sufficient
    const [pendingBets] = await conn.query(
      'SELECT b.*, bn.number, bn.amount as number_amount, bn.id as bn_id FROM bets b JOIN bet_numbers bn ON b.id = bn.bet_id WHERE b.game_id = ? AND b.status = ?',
      [id, 'pending']
    );

    // Get payout settings
    const [settings] = await conn.query("SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'payout_%'");
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

    for (const betId of Object.keys(betGroups)) {
      const bet = betGroups[betId];
      let totalWin = 0;

      for (const num of bet.numbers) {
        let isWin = false;

        if (bet.type === 'jodi') {
          isWin = num.number === resultStr;
          if (isWin) totalWin += num.amount * (payouts.payout_jodi || 90);
        } else if (bet.type === 'haruf_andar') {
          isWin = num.number === resultLastDigit;
          if (isWin) totalWin += num.amount * (payouts.payout_haruf || 9);
        } else if (bet.type === 'haruf_bahar') {
          isWin = num.number === resultFirstDigit;
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
        // Add winnings to wallet
        const [wallet] = await conn.query('SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE', [bet.user_id]);
        const newBalance = parseFloat(wallet[0].balance) + totalWin;

        await conn.query('UPDATE wallets SET balance = ? WHERE user_id = ?', [newBalance, bet.user_id]);

        await conn.query(
          'INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reference_id, remark) VALUES (?, ?, ?, ?, ?, ?)',
          [bet.user_id, 'win', totalWin, newBalance, `bet_${betId}`, `Won on ${bet.type} bet`]
        );

        // Create notification
        await conn.query(
          'INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)',
          [bet.user_id, 'win', `Congratulations! You won ₹${totalWin} on your ${bet.type} bet!`]
        );
      }
    }

    await conn.commit();
    res.json({ message: 'Result declared and bets settled.', resultId });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};
