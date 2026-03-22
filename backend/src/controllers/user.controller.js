const pool = require('../config/database');

exports.getProfile = async (req, res, next) => {
  try {
    const [wallets] = await pool.query('SELECT balance, bonus_balance FROM wallets WHERE user_id = ?', [req.user.id]);
    const wallet = wallets[0] || { balance: 0, bonus_balance: 0 };

    // Calculate exposure (sum of pending bets)
    const [exposureResult] = await pool.query(
      'SELECT COALESCE(SUM(total_amount), 0) as exposure FROM bets WHERE user_id = ? AND status = ?',
      [req.user.id, 'pending']
    );

    const exposure = parseFloat(exposureResult[0].exposure);

    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        phone: req.user.phone,
        role: req.user.role,
        referral_code: req.user.referral_code,
        created_at: req.user.created_at,
      },
      wallet: {
        balance: parseFloat(wallet.balance),
        bonus_balance: parseFloat(wallet.bonus_balance),
        exposure,
        available_withdrawal: parseFloat(wallet.balance),
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getBankAccounts = async (req, res, next) => {
  try {
    const [accounts] = await pool.query(
      'SELECT id, account_number, ifsc, bank_name, account_holder, created_at FROM bank_accounts WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ accounts });
  } catch (error) {
    next(error);
  }
};

exports.addBankAccount = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { account_number, ifsc, bank_name, account_holder } = req.body;

    if (!account_number || !ifsc || !bank_name || !account_holder) {
      return res.status(400).json({ error: 'All bank details are required.' });
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid IFSC code format.' });
    }

    await conn.beginTransaction();

    // Fraud check: same bank account used by another user
    const [existingAccounts] = await conn.query(
      'SELECT user_id FROM bank_accounts WHERE account_number = ? AND user_id != ?',
      [account_number, req.user.id]
    );

    let isFlagged = false;
    let flagReason = null;

    if (existingAccounts.length > 0) {
      isFlagged = true;
      flagReason = `Account number used by user IDs: ${existingAccounts.map(a => a.user_id).join(', ')}`;
    }

    const [result] = await conn.query(
      'INSERT INTO bank_accounts (user_id, account_number, ifsc, bank_name, account_holder, is_flagged, flag_reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, account_number, ifsc.toUpperCase(), bank_name, account_holder, isFlagged ? 1 : 0, flagReason]
    );

    await conn.commit();

    res.status(201).json({
      message: isFlagged ? 'Bank account added but flagged for review.' : 'Bank account added successfully.',
      account: { id: result.insertId, account_number, ifsc: ifsc.toUpperCase(), bank_name, account_holder },
      flagged: isFlagged
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

exports.deleteBankAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      'DELETE FROM bank_accounts WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Bank account not found.' });
    }

    res.json({ message: 'Bank account deleted.' });
  } catch (error) {
    next(error);
  }
};

exports.getAccountStatement = async (req, res, next) => {
  try {
    const { from, to, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = 'SELECT * FROM wallet_transactions WHERE user_id = ?';
    const params = [req.user.id];

    if (from) {
      query += ' AND created_at >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND created_at <= ?';
      params.push(to + ' 23:59:59');
    }

    // Count total
    const [countResult] = await pool.query(query.replace('SELECT *', 'SELECT COUNT(*) as total'), params);
    const total = countResult[0].total;

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [transactions] = await pool.query(query, params);

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getProfitLoss = async (req, res, next) => {
  try {
    const { from, to, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT b.id, b.type as event_type, g.name as event, b.total_amount, b.win_amount,
             (b.win_amount - b.total_amount) as profit_loss, b.status, b.created_at
      FROM bets b
      JOIN games g ON b.game_id = g.id
      WHERE b.user_id = ? AND b.status != 'pending'
    `;
    const params = [req.user.id];

    if (from) {
      query += ' AND b.created_at >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND b.created_at <= ?';
      params.push(to + ' 23:59:59');
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as countTable`;
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;

    query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [records] = await pool.query(query, params);

    res.json({
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      }
    });
  } catch (error) {
    next(error);
  }
};
