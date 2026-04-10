'use strict';

const pool = require('../config/database');
const { clampPagination, escapeLike } = require('../utils/pagination');

function buildWalletTransactionFilters(query) {
  const {
    search,
    user_id,
    moderator_id,
    type,
    status,
    reference_type,
    direction,
    from_date,
    to_date,
  } = query;

  const conditions = [];
  const params = [];

  if (user_id) {
    conditions.push('wt.user_id = ?');
    params.push(user_id);
  }

  if (moderator_id) {
    conditions.push('u.moderator_id = ?');
    params.push(moderator_id);
  }

  if (type) {
    conditions.push('wt.type = ?');
    params.push(type);
  }

  if (status) {
    conditions.push('wt.status = ?');
    params.push(status);
  }

  if (reference_type) {
    conditions.push('wt.reference_type = ?');
    params.push(reference_type);
  }

  if (direction === 'credit') {
    conditions.push('wt.amount > 0');
  } else if (direction === 'debit') {
    conditions.push('wt.amount < 0');
  }

  if (from_date) {
    conditions.push('DATE(wt.created_at) >= ?');
    params.push(from_date);
  }

  if (to_date) {
    conditions.push('DATE(wt.created_at) <= ?');
    params.push(to_date);
  }

  if (search && search.trim()) {
    const pattern = `%${escapeLike(search.trim())}%`;
    conditions.push(`(
      CAST(wt.id AS CHAR) LIKE ? ESCAPE '\\\\' OR
      CAST(wt.user_id AS CHAR) LIKE ? ESCAPE '\\\\' OR
      u.name LIKE ? ESCAPE '\\\\' OR
      u.phone LIKE ? ESCAPE '\\\\' OR
      COALESCE(moderator_user.name, '') LIKE ? ESCAPE '\\\\' OR
      COALESCE(wt.reference_type, '') LIKE ? ESCAPE '\\\\' OR
      COALESCE(wt.reference_id, '') LIKE ? ESCAPE '\\\\' OR
      COALESCE(wt.remark, '') LIKE ? ESCAPE '\\\\'
    )`);
    params.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern);
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

function buildBonusLedgerFilters(query) {
  const {
    search,
    user_id,
    moderator_id,
    entry_kind,
    bonus_type,
    from_date,
    to_date,
  } = query;

  const conditions = [];
  const params = [];

  if (user_id) {
    conditions.push('ledger.user_id = ?');
    params.push(user_id);
  }

  if (moderator_id) {
    conditions.push('ledger.moderator_id = ?');
    params.push(moderator_id);
  }

  if (entry_kind) {
    conditions.push('ledger.entry_kind = ?');
    params.push(entry_kind);
  }

  if (bonus_type) {
    conditions.push('ledger.bonus_type = ?');
    params.push(bonus_type);
  }

  if (from_date) {
    conditions.push('DATE(ledger.created_at) >= ?');
    params.push(from_date);
  }

  if (to_date) {
    conditions.push('DATE(ledger.created_at) <= ?');
    params.push(to_date);
  }

  if (search && search.trim()) {
    const pattern = `%${escapeLike(search.trim())}%`;
    conditions.push(`(
      CAST(ledger.source_id AS CHAR) LIKE ? ESCAPE '\\\\' OR
      CAST(ledger.user_id AS CHAR) LIKE ? ESCAPE '\\\\' OR
      ledger.user_name LIKE ? ESCAPE '\\\\' OR
      ledger.user_phone LIKE ? ESCAPE '\\\\' OR
      COALESCE(ledger.moderator_name, '') LIKE ? ESCAPE '\\\\' OR
      COALESCE(ledger.reference_type, '') LIKE ? ESCAPE '\\\\' OR
      COALESCE(ledger.reference_id, '') LIKE ? ESCAPE '\\\\' OR
      COALESCE(ledger.detail, '') LIKE ? ESCAPE '\\\\'
    )`);
    params.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern);
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

function getBonusLedgerSubquery() {
  return `
    SELECT
      CONCAT('credit-', b.id) AS row_key,
      b.id AS source_id,
      b.user_id,
      u.name AS user_name,
      u.phone AS user_phone,
      u.moderator_id,
      moderator_user.name AS moderator_name,
      'credit' AS entry_kind,
      b.type AS bonus_type,
      b.amount AS amount,
      'bonus' AS reference_type,
      b.reference_id AS reference_id,
      CASE
        WHEN b.type = 'first_deposit' THEN 'First deposit bonus credited to bonus balance'
        WHEN b.type = 'slab' THEN 'Deposit slab bonus credited to bonus balance'
        WHEN b.type = 'referral' THEN 'Referral bonus credited to bonus balance'
        WHEN b.type = 'daily' THEN 'Daily bonus credited to bonus balance'
        ELSE 'Bonus credit'
      END AS detail,
      b.created_at
    FROM bonuses b
    JOIN users u ON u.id = b.user_id
    LEFT JOIN users moderator_user ON moderator_user.id = u.moderator_id

    UNION ALL

    SELECT
      CONCAT('usage-', wt.id) AS row_key,
      wt.id AS source_id,
      wt.user_id,
      u.name AS user_name,
      u.phone AS user_phone,
      u.moderator_id,
      moderator_user.name AS moderator_name,
      'usage' AS entry_kind,
      'usage' AS bonus_type,
      wt.amount AS amount,
      wt.reference_type AS reference_type,
      wt.reference_id AS reference_id,
      COALESCE(wt.remark, 'Bonus balance used in bet placement') AS detail,
      wt.created_at AS created_at
    FROM wallet_transactions wt
    JOIN users u ON u.id = wt.user_id
    LEFT JOIN users moderator_user ON moderator_user.id = u.moderator_id
    WHERE wt.reference_type = 'bet_bonus'
  `;
}

/** GET /api/wallet-audit/user/:userId */
exports.getUserLedger = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const [transactions] = await pool.query(
      `SELECT wt.id, wt.type, wt.amount, wt.balance_after, wt.status,
              wt.reference_type, wt.reference_id, wt.remark, wt.created_at,
              u.name, u.phone
       FROM wallet_transactions wt
       JOIN users u ON u.id = wt.user_id
       WHERE wt.user_id = ?
       ORDER BY wt.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [countRow] = await pool.query(
      'SELECT COUNT(*) AS total FROM wallet_transactions WHERE user_id = ?',
      [userId]
    );

    const [walletRow] = await pool.query(
      'SELECT balance, bonus_balance FROM wallets WHERE user_id = ?',
      [userId]
    );

    res.json({
      transactions,
      total: countRow[0].total,
      wallet: walletRow[0] || { balance: 0, bonus_balance: 0 },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/wallet-audit/reconciliation */
exports.getReconciliationSummary = async (req, res, next) => {
  try {
    const [walletTotal] = await pool.query(
      'SELECT COALESCE(SUM(balance), 0) AS total FROM wallets'
    );

    const [txnSummary] = await pool.query(`
      SELECT
        type,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)      AS credits,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) AS debits,
        COUNT(*) AS count
      FROM wallet_transactions
      GROUP BY type
      ORDER BY type
    `);

    const [pendingWithdrawals] = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM withdraw_requests WHERE status = 'pending'"
    );

    res.json({
      wallet_total: walletTotal[0].total,
      transaction_summary: txnSummary,
      pending_withdrawals: pendingWithdrawals[0].total,
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/wallet-audit/transactions */
exports.getWalletTransactions = async (req, res, next) => {
  try {
    const { page, limit, offset } = clampPagination(req.query);
    const { whereClause, params } = buildWalletTransactionFilters(req.query);

    const baseFrom = `
      FROM wallet_transactions wt
      JOIN users u ON u.id = wt.user_id
      LEFT JOIN users moderator_user ON moderator_user.id = u.moderator_id
    `;

    const [[countRow], [summaryRows], typeBreakdown, transactions] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total ${baseFrom} ${whereClause}`, params),
      pool.query(
        `SELECT
           COUNT(*) AS total_transactions,
           COALESCE(SUM(CASE WHEN wt.amount > 0 THEN wt.amount ELSE 0 END), 0) AS total_credits,
           COALESCE(SUM(CASE WHEN wt.amount < 0 THEN ABS(wt.amount) ELSE 0 END), 0) AS total_debits,
           COALESCE(SUM(wt.amount), 0) AS net_flow,
           COUNT(DISTINCT wt.user_id) AS unique_users,
           COALESCE(SUM(CASE WHEN wt.status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_transactions
         ${baseFrom} ${whereClause}`,
        params
      ),
      pool.query(
        `SELECT
           wt.type,
           COUNT(*) AS transaction_count,
           COALESCE(SUM(CASE WHEN wt.amount > 0 THEN wt.amount ELSE 0 END), 0) AS credits,
           COALESCE(SUM(CASE WHEN wt.amount < 0 THEN ABS(wt.amount) ELSE 0 END), 0) AS debits,
           COALESCE(SUM(wt.amount), 0) AS net_amount
         ${baseFrom} ${whereClause}
         GROUP BY wt.type
         ORDER BY transaction_count DESC, wt.type ASC`,
        params
      ).then(([rows]) => rows),
      pool.query(
        `SELECT
           wt.id,
           wt.user_id,
           u.name AS user_name,
           u.phone AS user_phone,
           u.moderator_id,
           moderator_user.name AS moderator_name,
           wt.type,
           wt.amount,
           wt.balance_after,
           wt.status,
           wt.reference_type,
           wt.reference_id,
           wt.remark,
           wt.created_at
         ${baseFrom} ${whereClause}
         ORDER BY wt.created_at DESC, wt.id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ).then(([rows]) => rows),
    ]);

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total: countRow.total,
        totalPages: Math.ceil(countRow.total / limit),
      },
      summary: summaryRows[0] || {
        total_transactions: 0,
        total_credits: 0,
        total_debits: 0,
        net_flow: 0,
        unique_users: 0,
        pending_transactions: 0,
      },
      type_breakdown: typeBreakdown,
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/wallet-audit/bonus-transactions */
exports.getBonusTransactions = async (req, res, next) => {
  try {
    const { page, limit, offset } = clampPagination(req.query);
    const { user_id, moderator_id } = req.query;
    const bonusLedgerSubquery = getBonusLedgerSubquery();
    const { whereClause, params } = buildBonusLedgerFilters(req.query);

    const balanceConditions = [];
    const balanceParams = [];

    if (user_id) {
      balanceConditions.push('w.user_id = ?');
      balanceParams.push(user_id);
    }
    if (moderator_id) {
      balanceConditions.push('u.moderator_id = ?');
      balanceParams.push(moderator_id);
    }

    const balanceWhereClause = balanceConditions.length > 0
      ? `WHERE ${balanceConditions.join(' AND ')}`
      : '';

    const referralConditions = ["r.status = 'pending'"];
    const referralParams = [];
    if (user_id) {
      referralConditions.push('r.referred_user_id = ?');
      referralParams.push(user_id);
    }
    if (moderator_id) {
      referralConditions.push('u.moderator_id = ?');
      referralParams.push(moderator_id);
    }

    const referralWhereClause = `WHERE ${referralConditions.join(' AND ')}`;

    const [[countRow], [summaryRows], typeBreakdown, entries, [balanceRows], [pendingReferralRows]] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total
         FROM (${bonusLedgerSubquery}) AS ledger
         ${whereClause}`,
        params
      ),
      pool.query(
        `SELECT
           COUNT(*) AS total_entries,
           COALESCE(SUM(CASE WHEN ledger.entry_kind = 'credit' THEN ledger.amount ELSE 0 END), 0) AS total_credited,
           COALESCE(SUM(CASE WHEN ledger.entry_kind = 'usage' THEN ABS(ledger.amount) ELSE 0 END), 0) AS total_used,
           COALESCE(SUM(ledger.amount), 0) AS net_bonus_flow,
           COUNT(DISTINCT ledger.user_id) AS unique_users
         FROM (${bonusLedgerSubquery}) AS ledger
         ${whereClause}`,
        params
      ),
      pool.query(
        `SELECT
           ledger.entry_kind,
           ledger.bonus_type,
           COUNT(*) AS entry_count,
           COALESCE(SUM(CASE WHEN ledger.entry_kind = 'usage' THEN ABS(ledger.amount) ELSE ledger.amount END), 0) AS total_amount
         FROM (${bonusLedgerSubquery}) AS ledger
         ${whereClause}
         GROUP BY ledger.entry_kind, ledger.bonus_type
         ORDER BY ledger.entry_kind ASC, ledger.bonus_type ASC`,
        params
      ).then(([rows]) => rows),
      pool.query(
        `SELECT
           ledger.row_key,
           ledger.source_id,
           ledger.user_id,
           ledger.user_name,
           ledger.user_phone,
           ledger.moderator_id,
           ledger.moderator_name,
           ledger.entry_kind,
           ledger.bonus_type,
           ledger.amount,
           ledger.reference_type,
           ledger.reference_id,
           ledger.detail,
           ledger.created_at
         FROM (${bonusLedgerSubquery}) AS ledger
         ${whereClause}
         ORDER BY ledger.created_at DESC, ledger.source_id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ).then(([rows]) => rows),
      pool.query(
        `SELECT COALESCE(SUM(w.bonus_balance), 0) AS current_bonus_balance
         FROM wallets w
         JOIN users u ON u.id = w.user_id
         ${balanceWhereClause}`,
        balanceParams
      ),
      pool.query(
        `SELECT
           COUNT(*) AS pending_referral_count,
           COALESCE(SUM(r.bonus_amount), 0) AS pending_referral_amount
         FROM referrals r
         JOIN users u ON u.id = r.referred_user_id
         ${referralWhereClause}`,
        referralParams
      ),
    ]);

    res.json({
      entries,
      pagination: {
        page,
        limit,
        total: countRow.total,
        totalPages: Math.ceil(countRow.total / limit),
      },
      summary: {
        ...(summaryRows[0] || {
          total_entries: 0,
          total_credited: 0,
          total_used: 0,
          net_bonus_flow: 0,
          unique_users: 0,
        }),
        current_bonus_balance: balanceRows[0]?.current_bonus_balance || 0,
        pending_referral_count: pendingReferralRows[0]?.pending_referral_count || 0,
        pending_referral_amount: pendingReferralRows[0]?.pending_referral_amount || 0,
      },
      type_breakdown: typeBreakdown,
    });
  } catch (error) {
    next(error);
  }
};
