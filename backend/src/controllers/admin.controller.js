const pool = require('../config/database');

exports.listUsers = async (req, res, next) => {
  try {
    const { search, role, moderator_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT u.id, u.name, u.phone, u.role, u.moderator_id, u.referral_code, u.is_blocked, u.created_at,
             w.balance, w.bonus_balance,
             m.name as moderator_name
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      LEFT JOIN users m ON u.moderator_id = m.id
      WHERE 1=1
    `;
    const params = [];

    // Moderators can only see their assigned users
    if (req.user.role === 'moderator') {
      query += ' AND u.moderator_id = ?';
      params.push(req.user.id);
    }

    if (search) {
      query += ' AND (u.name LIKE ? OR u.phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (role) {
      query += ' AND u.role = ?';
      params.push(role);
    }
    if (moderator_id && req.user.role === 'admin') {
      if (moderator_id === 'unassigned') {
        query += ' AND u.moderator_id IS NULL';
      } else {
        query += ' AND u.moderator_id = ?';
        params.push(moderator_id);
      }
    }

    // Safe count query using a subquery
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as countTable`;
    const [countResult] = await pool.query(countQuery, params);

    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [users] = await pool.query(query, params);

    res.json({
      users,
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

exports.blockUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_blocked } = req.body;
    const [result] = await pool.query(
      "UPDATE users SET is_blocked = ? WHERE id = ? AND role = 'user'",
      [is_blocked ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ message: is_blocked ? 'User blocked.' : 'User unblocked.' });
  } catch (error) {
    next(error);
  }
};

exports.getSettings = async (req, res, next) => {
  try {
    const [settings] = await pool.query('SELECT * FROM settings ORDER BY setting_key');
    res.json({ settings });
  } catch (error) {
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;
    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'Settings array required.' });
    }

    for (const { key, value } of settings) {
      await pool.query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [value, key]);
    }

    res.json({ message: 'Settings updated.' });
  } catch (error) {
    next(error);
  }
};

exports.getFlaggedAccounts = async (req, res, next) => {
  try {
    const [accounts] = await pool.query(`
      SELECT ba.*, u.name as user_name, u.phone as user_phone
      FROM bank_accounts ba
      JOIN users u ON ba.user_id = u.id
      WHERE ba.is_flagged = 1
      ORDER BY ba.created_at DESC
    `);
    res.json({ accounts });
  } catch (error) {
    next(error);
  }
};
