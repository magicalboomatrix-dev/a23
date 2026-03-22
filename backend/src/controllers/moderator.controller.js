const pool = require('../config/database');
const bcrypt = require('bcryptjs');

function generateReferralCode() {
  return 'MOD' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

exports.createModerator = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Name, phone, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    await conn.beginTransaction();

    const hashedPassword = await bcrypt.hash(password, 10);
    const referralCode = generateReferralCode();

    const [result] = await conn.query(
      'INSERT INTO users (name, phone, password, role, referral_code) VALUES (?, ?, ?, ?, ?)',
      [name, phone, hashedPassword, 'moderator', referralCode]
    );

    await conn.query('INSERT INTO wallets (user_id, balance, bonus_balance) VALUES (?, 0.00, 0.00)', [result.insertId]);

    await conn.commit();

    res.status(201).json({
      message: 'Moderator created.',
      moderator: { id: result.insertId, name, phone, referral_code: referralCode }
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

exports.listModerators = async (req, res, next) => {
  try {
    const [moderators] = await pool.query(`
      SELECT u.id, u.name, u.phone, u.referral_code, u.is_blocked, u.created_at,
             (SELECT COUNT(*) FROM users WHERE moderator_id = u.id) as user_count
      FROM users u WHERE u.role = 'moderator'
      ORDER BY u.created_at DESC
    `);
    res.json({ moderators });
  } catch (error) {
    next(error);
  }
};

exports.updateModerator = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, is_blocked, password } = req.body;

    const fields = [];
    const values = [];

    if (name) { fields.push('name = ?'); values.push(name); }
    if (phone) { fields.push('phone = ?'); values.push(phone); }
    if (is_blocked !== undefined) { fields.push('is_blocked = ?'); values.push(is_blocked); }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      fields.push('password = ?');
      values.push(hashedPassword);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    values.push(id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ? AND role = 'moderator'`, values);

    res.json({ message: 'Moderator updated.' });
  } catch (error) {
    next(error);
  }
};

exports.deleteModerator = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Unassign users first
    await pool.query('UPDATE users SET moderator_id = NULL WHERE moderator_id = ?', [id]);
    await pool.query("DELETE FROM users WHERE id = ? AND role = 'moderator'", [id]);
    res.json({ message: 'Moderator deleted.' });
  } catch (error) {
    next(error);
  }
};

exports.assignUsers = async (req, res, next) => {
  try {
    const { moderator_id, user_ids } = req.body;
    if (!moderator_id || !Array.isArray(user_ids)) {
      return res.status(400).json({ error: 'moderator_id and user_ids array required.' });
    }

    const placeholders = user_ids.map(() => '?').join(',');
    await pool.query(
      `UPDATE users SET moderator_id = ? WHERE id IN (${placeholders}) AND role = 'user'`,
      [moderator_id, ...user_ids]
    );

    res.json({ message: `${user_ids.length} users assigned to moderator.` });
  } catch (error) {
    next(error);
  }
};
