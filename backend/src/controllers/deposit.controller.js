const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');

function cleanupUploadedFile(file) {
  if (!file || !file.filename) {
    return;
  }

  const filePath = path.join(uploadDir, file.filename);
  fs.promises.unlink(filePath).catch(() => {});
}

async function notifyDuplicateDepositAttempt(userId, utrNumber, originalUserId) {
  const [[attemptingUsers], [originalUsers]] = await Promise.all([
    pool.query('SELECT name, phone FROM users WHERE id = ? LIMIT 1', [userId]),
    pool.query('SELECT name, phone FROM users WHERE id = ? LIMIT 1', [originalUserId])
  ]);

  const [users] = await pool.query(
    `SELECT id, role FROM users WHERE role = 'admin'
     UNION
     SELECT moderator_id AS id, 'moderator' AS role
     FROM users
     WHERE id = ? AND moderator_id IS NOT NULL`,
    [userId]
  );

  const uniqueRecipients = [...new Set(users.map((user) => user.id).filter(Boolean))];
  if (uniqueRecipients.length === 0) {
    return;
  }

  const attemptedBy = attemptingUsers[0]
    ? `${attemptingUsers[0].name || 'Unknown'} (${attemptingUsers[0].phone || userId})`
    : `User ${userId}`;
  const existingOwner = originalUsers[0]
    ? `${originalUsers[0].name || 'Unknown'} (${originalUsers[0].phone || originalUserId})`
    : `User ${originalUserId}`;
  const message = `Duplicate deposit UTR attempt detected. UTR ${utrNumber} was submitted by ${attemptedBy} and already exists for ${existingOwner}.`;
  for (const recipientId of uniqueRecipients) {
    await pool.query(
      'INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)',
      [recipientId, 'system', message]
    );
  }
}

exports.requestDeposit = async (req, res, next) => {
  try {
    const { amount, utr_number } = req.body;

    if (!amount || !utr_number) {
      cleanupUploadedFile(req.file);
      return res.status(400).json({ error: 'Amount and UTR number are required.' });
    }

    const parsedAmount = parseFloat(amount);
    if (parsedAmount <= 0) {
      cleanupUploadedFile(req.file);
      return res.status(400).json({ error: 'Amount must be positive.' });
    }

    // Check min deposit
    const [settings] = await pool.query("SELECT setting_value FROM settings WHERE setting_key = 'min_deposit'");
    const minDeposit = settings.length > 0 ? parseFloat(settings[0].setting_value) : 100;
    if (parsedAmount < minDeposit) {
      cleanupUploadedFile(req.file);
      return res.status(400).json({ error: `Minimum deposit is ₹${minDeposit}.` });
    }

    // Check duplicate UTR
    const [existingUTR] = await pool.query('SELECT id, user_id FROM deposits WHERE utr_number = ?', [utr_number]);
    if (existingUTR.length > 0) {
      cleanupUploadedFile(req.file);
      await notifyDuplicateDepositAttempt(req.user.id, utr_number, existingUTR[0].user_id);
      return res.status(409).json({ error: 'This UTR number has already been used.' });
    }

    const screenshot = req.file ? req.file.filename : null;

    const [result] = await pool.query(
      'INSERT INTO deposits (user_id, amount, utr_number, screenshot) VALUES (?, ?, ?, ?)',
      [req.user.id, parsedAmount, utr_number, screenshot]
    );

    res.status(201).json({
      message: 'Deposit request submitted.',
      deposit: { id: result.insertId, amount: parsedAmount, utr_number, status: 'pending' }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      cleanupUploadedFile(req.file);
      const [existingUTR] = await pool.query('SELECT user_id FROM deposits WHERE utr_number = ?', [req.body.utr_number]);
      if (existingUTR.length > 0) {
        await notifyDuplicateDepositAttempt(req.user.id, req.body.utr_number, existingUTR[0].user_id);
      }
      return res.status(409).json({ error: 'This UTR number has already been used.' });
    }

    next(error);
  }
};

exports.getDepositHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM deposits WHERE user_id = ?', [req.user.id]
    );

    const [deposits] = await pool.query(
      'SELECT id, amount, utr_number, status, created_at, updated_at FROM deposits WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [req.user.id, parseInt(limit), offset]
    );

    res.json({
      deposits,
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

exports.approveDeposit = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;

    await conn.beginTransaction();

    let depositQuery = 'SELECT d.* FROM deposits d WHERE d.id = ? AND d.status = ? FOR UPDATE';
    const depositParams = [id, 'pending'];

    if (req.user.role === 'moderator') {
      depositQuery = `
        SELECT d.*
        FROM deposits d
        JOIN users u ON d.user_id = u.id
        WHERE d.id = ? AND d.status = ? AND u.moderator_id = ?
        FOR UPDATE
      `;
      depositParams.push(req.user.id);
    }

    const [deposits] = await conn.query(depositQuery, depositParams);
    if (deposits.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Deposit not found or already processed.' });
    }

    const deposit = deposits[0];

    // Update deposit status
    await conn.query('UPDATE deposits SET status = ?, approved_by = ? WHERE id = ?', ['approved', req.user.id, id]);

    // Add to wallet
    const [wallets] = await conn.query('SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE', [deposit.user_id]);
    const newBalance = parseFloat(wallets[0].balance) + parseFloat(deposit.amount);
    await conn.query('UPDATE wallets SET balance = ? WHERE user_id = ?', [newBalance, deposit.user_id]);

    // Record transaction
    await conn.query(
      'INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reference_id, remark) VALUES (?, ?, ?, ?, ?, ?)',
      [deposit.user_id, 'deposit', deposit.amount, newBalance, `deposit_${id}`, 'Deposit approved']
    );

    // Check for first deposit bonus
    const [depositCount] = await conn.query(
      'SELECT COUNT(*) as count FROM deposits WHERE user_id = ? AND status = ?',
      [deposit.user_id, 'approved']
    );

    if (depositCount[0].count === 1) {
      // First deposit - apply bonus
      const [bonusSettings] = await conn.query(
        "SELECT setting_value FROM settings WHERE setting_key = 'first_deposit_bonus_percent'"
      );

      if (bonusSettings.length > 0) {
        const bonusPercent = parseFloat(bonusSettings[0].setting_value);
        const bonusAmount = (parseFloat(deposit.amount) * bonusPercent) / 100;

        await conn.query('UPDATE wallets SET bonus_balance = bonus_balance + ? WHERE user_id = ?',
          [bonusAmount, deposit.user_id]);

        await conn.query('INSERT INTO bonuses (user_id, type, amount, reference_id) VALUES (?, ?, ?, ?)',
          [deposit.user_id, 'first_deposit', bonusAmount, `deposit_${id}`]);
      }
    }

    // Check slab bonus
    const slabKeys = ['bonus_slab_10000', 'bonus_slab_5000', 'bonus_slab_2500'];
    for (const key of slabKeys) {
      const threshold = parseInt(key.split('_').pop());
      if (parseFloat(deposit.amount) >= threshold) {
        const [slabSettings] = await conn.query("SELECT setting_value FROM settings WHERE setting_key = ?", [key]);
        if (slabSettings.length > 0) {
          const slabBonus = parseFloat(slabSettings[0].setting_value);
          await conn.query('UPDATE wallets SET bonus_balance = bonus_balance + ? WHERE user_id = ?',
            [slabBonus, deposit.user_id]);
          await conn.query('INSERT INTO bonuses (user_id, type, amount, reference_id) VALUES (?, ?, ?, ?)',
            [deposit.user_id, 'slab', slabBonus, `deposit_${id}_slab_${threshold}`]);
          break; // Only apply highest matching slab
        }
      }
    }

    // Notification
    await conn.query('INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)',
      [deposit.user_id, 'deposit', `Your deposit of ₹${deposit.amount} has been approved.`]);

    await conn.commit();
    res.json({ message: 'Deposit approved.' });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

exports.rejectDeposit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    let scopeQuery = 'SELECT user_id, amount FROM deposits WHERE id = ? AND status = ?';
    const scopeParams = [id, 'pending'];

    if (req.user.role === 'moderator') {
      scopeQuery = `
        SELECT d.user_id, d.amount
        FROM deposits d
        JOIN users u ON d.user_id = u.id
        WHERE d.id = ? AND d.status = ? AND u.moderator_id = ?
      `;
      scopeParams.push(req.user.id);
    }

    const [scopedDeposits] = await pool.query(scopeQuery, scopeParams);
    if (scopedDeposits.length === 0) {
      return res.status(404).json({ error: 'Deposit not found or already processed.' });
    }

    const [result] = await pool.query(
      'UPDATE deposits SET status = ?, reject_reason = ?, approved_by = ? WHERE id = ? AND status = ?',
      ['rejected', reason || 'Rejected by admin', req.user.id, id, 'pending']
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Deposit not found or already processed.' });
    }

    // Get deposit for notification
    if (scopedDeposits.length > 0) {
      await pool.query('INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)',
        [scopedDeposits[0].user_id, 'deposit', `Your deposit of ₹${scopedDeposits[0].amount} has been rejected. Reason: ${reason || 'N/A'}`]);
    }

    res.json({ message: 'Deposit rejected.' });
  } catch (error) {
    next(error);
  }
};

exports.getAllDeposits = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT d.*, u.name as user_name, u.phone as user_phone
      FROM deposits d
      JOIN users u ON d.user_id = u.id
    `;
    const params = [];

    // Moderator can only see their assigned users' deposits
    if (req.user.role === 'moderator') {
      query += ' WHERE d.user_id IN (SELECT id FROM users WHERE moderator_id = ?)';
      params.push(req.user.id);
      if (status) {
        query += ' AND d.status = ?';
        params.push(status);
      }
    } else if (status) {
      query += ' WHERE d.status = ?';
      params.push(status);
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as countTable`;
    const [countResult] = await pool.query(countQuery, params);

    query += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [deposits] = await pool.query(query, params);

    res.json({
      deposits,
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
