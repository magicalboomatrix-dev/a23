const pool = require('../config/database');
const { settleBetsForGame } = require('../utils/settle-bets');

exports.listGames = async (req, res, next) => {
  try {
    const [games] = await pool.query(`
      SELECT g.*, gr.result_number, gr.result_date,
             gry.result_number AS yesterday_result_number,
             gry.result_date AS yesterday_result_date,
             CASE
               WHEN gr.id IS NOT NULL AND COALESCE(g.result_time, g.close_time) <= CURTIME() THEN 1
               ELSE 0
             END AS result_visible,
             COALESCE(pb.pending_bets_count, 0) AS pending_bets_count
      FROM games g
      LEFT JOIN game_results gr ON gr.id = (
        SELECT gr2.id
        FROM game_results gr2
        WHERE gr2.game_id = g.id
          AND gr2.declared_at IS NOT NULL
          AND gr2.result_date = CURDATE()
        ORDER BY gr2.result_date DESC, gr2.declared_at DESC
        LIMIT 1
      )
      LEFT JOIN game_results gry ON gry.id = (
        SELECT gr3.id
        FROM game_results gr3
        WHERE gr3.game_id = g.id
          AND gr3.declared_at IS NOT NULL
          AND gr3.result_date = CURDATE() - INTERVAL 1 DAY
        ORDER BY gr3.result_date DESC, gr3.declared_at DESC
        LIMIT 1
      )
      LEFT JOIN (
        SELECT game_id, COUNT(*) AS pending_bets_count
        FROM bets
        WHERE status = 'pending'
        GROUP BY game_id
      ) pb ON pb.game_id = g.id
      WHERE g.is_active = 1
      ORDER BY g.open_time
    `);
    res.json({ games, server_now: new Date().toISOString() });
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

    res.json({ game: games[0], results, server_now: new Date().toISOString() });
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
      'INSERT INTO games (name, open_time, close_time, result_time) VALUES (?, ?, ?, ?)',
      [name, open_time, close_time, close_time]
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
    if (close_time !== undefined) {
      fields.push('close_time = ?');
      values.push(close_time);
      fields.push('result_time = ?');
      values.push(close_time);
    }
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

exports.deleteGame = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT id FROM games WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Game not found.' });
    }

    await pool.query('DELETE FROM games WHERE id = ?', [id]);
    res.json({ message: 'Game deleted.' });
  } catch (error) {
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

    // Check game's close/result time to decide whether to settle now
    const [gameRows] = await conn.query('SELECT close_time, result_time FROM games WHERE id = ?', [id]);
    if (gameRows.length === 0) {
      return res.status(404).json({ error: 'Game not found.' });
    }
    const checkTime = gameRows[0].result_time || gameRows[0].close_time;
    let canSettle = true;
    if (checkTime) {
      const now = new Date();
      const [h, m, s] = checkTime.split(':').map(Number);
      const resultMoment = new Date(now);
      resultMoment.setHours(h, m, s || 0, 0);
      canSettle = now >= resultMoment;
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

    // Only settle bets if past the game's close/result time
    let settledCount = 0;
    if (canSettle) {
      settledCount = await settleBetsForGame(conn, id, resultStr, resultId);
    }

    await conn.commit();

    const message = canSettle
      ? `Result declared and ${settledCount} bet(s) settled.`
      : 'Result saved. Bets will auto-settle after close time.';
    res.json({ message, resultId, settledCount });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

// Manual settle endpoint — settles pending bets for a game using the most recent declared result
exports.settleBets = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;

    // Check game exists and get close/result time
    const [games] = await conn.query('SELECT id, close_time, result_time FROM games WHERE id = ?', [id]);
    if (games.length === 0) {
      return res.status(404).json({ error: 'Game not found.' });
    }

    // Block settlement before the game's result/close time
    const game = games[0];
    const checkTime = game.result_time || game.close_time;
    if (checkTime) {
      const now = new Date();
      const [h, m, s] = checkTime.split(':').map(Number);
      const resultMoment = new Date(now);
      resultMoment.setHours(h, m, s || 0, 0);
      if (now < resultMoment) {
        return res.status(400).json({ error: `Cannot settle before result time (${checkTime}). Please wait.` });
      }
    }

    // Get the most recent declared result (covers yesterday's bets after midnight)
    const [results] = await conn.query(
      `SELECT id, result_number, result_date FROM game_results
       WHERE game_id = ? AND declared_at IS NOT NULL
       ORDER BY result_date DESC, declared_at DESC LIMIT 1`,
      [id]
    );

    if (results.length === 0) {
      return res.status(400).json({ error: 'No result declared for this game. Declare a result first.' });
    }

    const { id: resultId, result_number } = results[0];
    const resultStr = result_number.toString().padStart(2, '0');

    await conn.beginTransaction();
    const settledCount = await settleBetsForGame(conn, id, resultStr, resultId);
    await conn.commit();

    res.json({ message: `Settled ${settledCount} bets.`, settledCount });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};
