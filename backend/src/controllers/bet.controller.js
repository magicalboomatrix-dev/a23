const pool = require('../config/database');
const { recordWalletTransaction } = require('../utils/wallet-ledger');

// Helper to parse MySQL TIME string (handles "HH:MM:SS" or "HH:MM")
function parseTimeString(timeVal) {
  const str = typeof timeVal === 'string' ? timeVal : String(timeVal);
  const parts = str.split(':').map(Number);
  return { hours: parts[0] || 0, minutes: parts[1] || 0 };
}

function resolveGameWindow(openTimeValue, closeTimeValue, referenceDate = new Date()) {
  const openParsed = parseTimeString(openTimeValue);
  const closeParsed = parseTimeString(closeTimeValue);
  const isOvernight = closeParsed.hours < openParsed.hours ||
    (closeParsed.hours === openParsed.hours && closeParsed.minutes < openParsed.minutes);

  const openTime = new Date(referenceDate);
  openTime.setHours(openParsed.hours, openParsed.minutes, 0, 0);

  const closeTime = new Date(referenceDate);
  closeTime.setHours(closeParsed.hours, closeParsed.minutes, 0, 0);

  if (isOvernight) {
    if (referenceDate.getHours() > closeParsed.hours ||
        (referenceDate.getHours() === closeParsed.hours && referenceDate.getMinutes() >= closeParsed.minutes)) {
      openTime.setDate(openTime.getDate() - 1);
    } else {
      closeTime.setDate(closeTime.getDate() + 1);
    }
  }

  return { openTime, closeTime, isOvernight };
}

// Generate crossing combinations: digits A,B → "AB" and "BA" (if different)
function generateCrossingNumbers(digit1, digit2) {
  const d1 = digit1.toString();
  const d2 = digit2.toString();
  const nums = [`${d1}${d2}`];
  if (d1 !== d2) nums.push(`${d2}${d1}`);
  return nums;
}

exports.placeBet = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { game_id, type, numbers, crossing_digits } = req.body;

    // Validate input
    if (!game_id || !type) {
      return res.status(400).json({ error: 'game_id and type are required.' });
    }

    const validTypes = ['jodi', 'haruf_andar', 'haruf_bahar', 'crossing'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid bet type.' });
    }

    // Build the final numbers array
    let betNumbers = [];

    if (type === 'crossing') {
      // Crossing: user provides two digits and an amount, we generate the jodi combinations
      if (crossing_digits) {
        const { digit1, digit2, amount } = crossing_digits;
        if (digit1 === undefined || digit2 === undefined || !amount || parseFloat(amount) <= 0) {
          return res.status(400).json({ error: 'crossing_digits requires digit1, digit2, and positive amount.' });
        }
        if (!/^\d$/.test(String(digit1)) || !/^\d$/.test(String(digit2))) {
          return res.status(400).json({ error: 'Crossing digits must be single digits (0-9).' });
        }
        const combos = generateCrossingNumbers(digit1, digit2);
        betNumbers = combos.map(n => ({ number: n, amount: parseFloat(amount) }));
      } else if (numbers && Array.isArray(numbers) && numbers.length > 0) {
        betNumbers = numbers;
      } else {
        return res.status(400).json({ error: 'Crossing bet requires crossing_digits or numbers array.' });
      }
    } else {
      if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
        return res.status(400).json({ error: 'numbers array is required.' });
      }
      betNumbers = numbers;
    }

    // Validate number format per type
    for (const item of betNumbers) {
      if (item.number === undefined || item.number === null || !item.amount || parseFloat(item.amount) <= 0) {
        return res.status(400).json({ error: 'Each number must have a valid number and positive amount.' });
      }
      const numStr = String(item.number);
      if (type === 'jodi' || type === 'crossing') {
        if (!/^\d{2}$/.test(numStr)) {
          return res.status(400).json({ error: `${type} bet numbers must be 2-digit (00-99). Got: ${numStr}` });
        }
      } else if (type === 'haruf_andar' || type === 'haruf_bahar') {
        if (!/^\d$/.test(numStr)) {
          return res.status(400).json({ error: 'Haruf bet numbers must be single digit (0-9). Got: ' + numStr });
        }
      }
    }

    await conn.beginTransaction();

    // Check game exists and is active
    const [games] = await conn.query('SELECT * FROM games WHERE id = ? AND is_active = 1', [game_id]);
    if (games.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Game not found or inactive.' });
    }

    const game = games[0];

    const now = new Date();
    const { openTime, closeTime } = resolveGameWindow(game.open_time, game.close_time, now);

    if (now < openTime) {
      await conn.rollback();
      return res.status(400).json({
        error: `Betting opens at ${openTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })} for this game.`
      });
    }

    if (now >= closeTime) {
      await conn.rollback();
      return res.status(400).json({ error: 'Betting is closed for this game.' });
    }

    // Check time-based max bet
    const minutesLeft = (closeTime - now) / (1000 * 60);
    const [settings] = await conn.query("SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'max_bet_%' OR setting_key = 'min_bet'");
    const settingsMap = {};
    for (const s of settings) {
      settingsMap[s.setting_key] = parseFloat(s.setting_value);
    }

    let maxBet;
    if (minutesLeft > 60) {
      maxBet = settingsMap.max_bet_60min || 10000;
    } else if (minutesLeft > 30) {
      maxBet = settingsMap.max_bet_30min || 5000;
    } else if (minutesLeft > 15) {
      maxBet = settingsMap.max_bet_15min || 1000;
    } else {
      maxBet = settingsMap.max_bet_last_15min || 500;
    }

    const minBet = settingsMap.min_bet || 10;
    const totalAmount = betNumbers.reduce((sum, n) => sum + parseFloat(n.amount), 0);

    // Validate each number amount
    for (const item of betNumbers) {
      if (parseFloat(item.amount) < minBet) {
        await conn.rollback();
        return res.status(400).json({ error: `Minimum bet per number is ₹${minBet}.` });
      }
      if (parseFloat(item.amount) > maxBet) {
        await conn.rollback();
        return res.status(400).json({ error: `Maximum bet per number is ₹${maxBet} (${Math.round(minutesLeft)} min before close).` });
      }
    }

    // Check wallet balance
    const [wallets] = await conn.query('SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE', [req.user.id]);
    if (wallets.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'Wallet not found.' });
    }

    const currentBalance = parseFloat(wallets[0].balance);
    if (currentBalance < totalAmount) {
      await conn.rollback();
      return res.status(400).json({ error: 'Insufficient balance.' });
    }

    // Create bet
    const [betResult] = await conn.query(
      'INSERT INTO bets (user_id, game_id, type, total_amount) VALUES (?, ?, ?, ?)',
      [req.user.id, game_id, type, totalAmount]
    );

    const betId = betResult.insertId;

    // Insert bet numbers
    for (const item of betNumbers) {
      await conn.query(
        'INSERT INTO bet_numbers (bet_id, number, amount) VALUES (?, ?, ?)',
        [betId, String(item.number).padStart(type === 'jodi' || type === 'crossing' ? 2 : 1, '0'), parseFloat(item.amount)]
      );
    }

    const newBalance = await recordWalletTransaction(conn, {
      userId: req.user.id,
      type: 'bet',
      amount: -totalAmount,
      referenceType: 'bet',
      referenceId: `bet_${betId}`,
      remark: `${type} bet on ${game.name}`,
    });

    await conn.commit();

    res.status(201).json({
      message: 'Bet placed successfully.',
      bet: { id: betId, game_id, type, total_amount: totalAmount, numbers: betNumbers.length },
      balance: newBalance,
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

exports.getUserBets = async (req, res, next) => {
  try {
    const { game_id, status, search, from_date, to_date, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT b.*, g.name as game_name
      FROM bets b
      JOIN games g ON b.game_id = g.id
      WHERE b.user_id = ?
    `;
    const params = [req.user.id];

    if (game_id) {
      query += ' AND b.game_id = ?';
      params.push(game_id);
    }
    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }
    if (from_date) {
      query += ' AND DATE(b.created_at) >= ?';
      params.push(from_date);
    }
    if (to_date) {
      query += ' AND DATE(b.created_at) <= ?';
      params.push(to_date);
    }
    if (search) {
      query += `
        AND (
          g.name LIKE ?
          OR b.type LIKE ?
          OR EXISTS (
            SELECT 1
            FROM bet_numbers bn_search
            WHERE bn_search.bet_id = b.id
              AND bn_search.number LIKE ?
          )
        )
      `;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as countTable`;
    const [countResult] = await pool.query(countQuery, params);

    query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [bets] = await pool.query(query, params);

    // Get bet numbers for each bet
    for (const bet of bets) {
      const [nums] = await pool.query('SELECT number, amount FROM bet_numbers WHERE bet_id = ?', [bet.id]);
      bet.numbers = nums;
    }

    res.json({
      bets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / parseInt(limit)),
      }
    });
  } catch (error) {
    next(error);
  }
};
