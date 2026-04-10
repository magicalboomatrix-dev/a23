/**
 * Auto Deposit Controller
 * Handles user deposit order creation, admin monitoring, and order management.
 */

const pool = require('../config/database');
const crypto = require('crypto');
const {
  ORDER_EXPIRY_MINUTES,
  LATE_MATCH_GRACE_MINUTES,
  getDepositLimits,
  expirePendingOrders,
  applyDepositBonuses,
} = require('../services/auto-deposit-matcher');
const { resolveUpiForUser } = require('../services/upi-resolver');
const { buildUpiLink, buildProtectedQrUrl, verifyQrLaunchToken, generateQrDataUri } = require('../services/qr-generator');
const { clampPagination } = require('../utils/pagination');
const { recordWalletTransaction } = require('../utils/wallet-ledger');

function escapeHtml(value) {
  return `${value ?? ''}`
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getDepositPageUrl() {
  const frontendBase = process.env.FRONTEND_URL?.split(',')[0]?.trim();
  if (!frontendBase) {
    return '/deposit';
  }
  return `${frontendBase.replace(/\/$/, '')}/deposit`;
}

async function buildQrPayload({ orderId, orderRef, upiId, payeeName, payAmount, expiresAt }) {
  const upiLink = buildUpiLink({ upiId, payeeName, amount: payAmount, orderRef });
  const qrDataUri = await generateQrDataUri(upiLink);
  const downloadQrUrl = buildProtectedQrUrl({ orderId, orderRef, upiId, payeeName, amount: payAmount, expiresAt });
  const downloadQrDataUri = await generateQrDataUri(downloadQrUrl);

  return {
    upiLink,
    qrDataUri,
    downloadQrUrl,
    downloadQrDataUri,
  };
}

function renderQrStatusPage({ title, message, tone = 'warning', autoOpenUpiLink = null }) {
  const palette = tone === 'success'
    ? { accent: '#15803d', background: '#f0fdf4', border: '#86efac', text: '#166534' }
    : { accent: '#c2410c', background: '#fff7ed', border: '#fdba74', text: '#9a3412' };
  const depositUrl = escapeHtml(getDepositPageUrl());
  const safeUpiLink = autoOpenUpiLink ? escapeHtml(autoOpenUpiLink) : '';
  const autoOpenScript = autoOpenUpiLink
    ? `<script>setTimeout(function () { window.location.href = ${JSON.stringify(autoOpenUpiLink)}; }, 250);</script>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: linear-gradient(180deg, #fffaf0 0%, #fff 100%); font-family: Arial, sans-serif; color: #1f2937; }
      .card { width: min(92vw, 460px); background: #fff; border: 1px solid ${palette.border}; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08); padding: 28px 22px; }
      .badge { display: inline-block; margin-bottom: 12px; padding: 6px 10px; background: ${palette.background}; color: ${palette.accent}; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
      h1 { margin: 0 0 10px; color: ${palette.text}; font-size: 24px; }
      p { margin: 0; line-height: 1.6; font-size: 15px; }
      .actions { margin-top: 18px; display: flex; flex-direction: column; gap: 10px; }
      .button { display: inline-flex; align-items: center; justify-content: center; min-height: 46px; text-decoration: none; font-weight: 700; border: 1px solid transparent; }
      .button.primary { background: ${palette.accent}; color: white; }
      .button.secondary { background: white; color: ${palette.accent}; border-color: ${palette.border}; }
      .hint { margin-top: 8px; font-size: 12px; color: #6b7280; }
    </style>
    ${autoOpenScript}
  </head>
  <body>
    <main class="card">
      <span class="badge">A23 Satta Deposit QR</span>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      <div class="actions">
        ${autoOpenUpiLink ? `<a href="${safeUpiLink}" class="button secondary">Open UPI App</a><p class="hint">If your UPI app did not open automatically, tap the button above.</p>` : ''}
        <a href="${depositUrl}" class="button primary">Generate New QR</a>
      </div>
    </main>
  </body>
</html>`;
}

/**
 * Generate a short unique order reference (e.g., "RM7X3K9P")
 */
function generateOrderRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
  let ref = 'RM';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    ref += chars[bytes[i] % chars.length];
  }
  return ref;
}

/**
 * Add random paise (01-99) to make the payment amount unique.
 * Also ensures no other pending order has the same pay_amount.
 */
async function generateUniquePayAmount(baseAmount) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const paise = Math.floor(Math.random() * 99) + 1; // 1-99
    const payAmount = parseFloat((Math.floor(baseAmount) + paise / 100).toFixed(2));
    const [existing] = await pool.query(
      `SELECT id
       FROM pending_deposit_orders
       WHERE pay_amount = ?
         AND (
           (status = 'pending' AND expires_at > NOW())
           OR
           (status = 'expired' AND expires_at > DATE_SUB(NOW(), INTERVAL ? MINUTE))
         )
       LIMIT 1`,
      [payAmount, LATE_MATCH_GRACE_MINUTES]
    );
    if (existing.length === 0) return payAmount;
  }
  // All 99 paise slots are occupied across active + late-matchable recent orders.
  // Reject rather than reusing an amount that could cause a wrong credit.
  throw new Error('Unable to generate unique payment amount right now. Please wait a few minutes and try again.');
}

/**
 * POST /api/auto-deposit/order
 * User creates a pending deposit order (just amount, no UTR needed)
 */
exports.createDepositOrder = async (req, res, next) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required.' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    const { minDeposit, maxDeposit } = await getDepositLimits();

    if (parsedAmount < minDeposit) {
      return res.status(400).json({ error: `Minimum deposit is ₹${minDeposit}.` });
    }

    if (parsedAmount > maxDeposit) {
      return res.status(400).json({ error: `Maximum deposit is ₹${maxDeposit}.` });
    }

    // Check if this user already has an active pending order for the same base amount
    const [existingOrders] = await pool.query(
      `SELECT id, amount, pay_amount, order_ref, created_at, expires_at
       FROM pending_deposit_orders
       WHERE user_id = ? AND status = 'pending' AND amount = ? AND expires_at > NOW()
       LIMIT 1`,
      [req.user.id, parsedAmount]
    );

    if (existingOrders.length > 0) {
      return res.status(409).json({
        error: 'You already have a pending deposit order for this amount.',
        existing_order: {
          id: existingOrders[0].id,
          amount: parseFloat(existingOrders[0].amount),
          created_at: existingOrders[0].created_at,
          expires_at: existingOrders[0].expires_at,
        },
      });
    }

    // Limit total active orders per user (prevent abuse)
    const [activeOrders] = await pool.query(
      "SELECT COUNT(*) as count FROM pending_deposit_orders WHERE user_id = ? AND status = 'pending' AND expires_at > NOW()",
      [req.user.id]
    );

    if (activeOrders[0].count >= 3) {
      return res.status(429).json({ error: 'Too many pending deposit orders. Please wait for existing orders to process or expire.' });
    }

    // Resolve UPI ID from moderator or admin
    const upiInfo = await resolveUpiForUser(req.user.id);
    if (!upiInfo) {
      return res.status(503).json({ error: 'No payment UPI is currently available. Please try again later.' });
    }

    const { upiId, payeeName } = upiInfo;

    // Create the order with unique ref and pay amount
    const orderRef = generateOrderRef();
    const payAmount = await generateUniquePayAmount(parsedAmount);
    const expiresAt = new Date(Date.now() + ORDER_EXPIRY_MINUTES * 60 * 1000);
    const [result] = await pool.query(
      'INSERT INTO pending_deposit_orders (user_id, amount, order_ref, pay_amount, expires_at) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, parsedAmount, orderRef, payAmount, expiresAt]
    );

    // Build UPI payment link with reference in transaction note
    const { upiLink, qrDataUri, downloadQrUrl, downloadQrDataUri } = await buildQrPayload({
      orderId: result.insertId,
      orderRef,
      upiId,
      payeeName,
      payAmount,
      expiresAt,
    });

    res.status(201).json({
      message: `Deposit order created. Please complete UPI payment within ${ORDER_EXPIRY_MINUTES} minutes.`,
      order: {
        id: result.insertId,
        amount: parsedAmount,
        pay_amount: payAmount,
        order_ref: orderRef,
        expires_at: expiresAt.toISOString(),
        expires_in_seconds: ORDER_EXPIRY_MINUTES * 60,
      },
      payment_details: {
        upi_id: upiId,
        payee_name: payeeName,
        amount: payAmount,
        order_ref: orderRef,
        upi_link: upiLink,
        qr_code: qrDataUri,
        download_qr_url: downloadQrUrl,
        download_qr_code: downloadQrDataUri,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auto-deposit/order/status/:id
 * User checks status of their deposit order
 */
exports.getOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [orders] = await pool.query(
      `SELECT pdo.id, pdo.amount, pdo.pay_amount, pdo.order_ref, pdo.status, pdo.matched_deposit_id, pdo.created_at, pdo.expires_at,
              d.utr_number, d.status as deposit_status
       FROM pending_deposit_orders pdo
       LEFT JOIN deposits d ON d.id = pdo.matched_deposit_id
       WHERE pdo.id = ? AND pdo.user_id = ?`,
      [id, req.user.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orders[0];
    const now = new Date();
    const expiresAt = new Date(order.expires_at);
    const isExpired = order.status === 'pending' && expiresAt <= now;

    // If expired but not yet updated, mark it
    if (isExpired) {
      await pool.query("UPDATE pending_deposit_orders SET status = 'expired' WHERE id = ? AND status = 'pending'", [id]);
      order.status = 'expired';
    }

    res.json({
      order: {
        id: order.id,
        amount: parseFloat(order.amount),
        status: order.status,
        utr_number: order.utr_number || null,
        deposit_status: order.deposit_status || null,
        created_at: order.created_at,
        expires_at: order.expires_at,
        remaining_seconds: order.status === 'pending' ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auto-deposit/orders
 * User gets their deposit order history
 */
exports.getMyOrders = async (req, res, next) => {
  try {
    const { page, limit, offset } = clampPagination(req.query);

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM pending_deposit_orders WHERE user_id = ?',
      [req.user.id]
    );

    const [orders] = await pool.query(
      `SELECT pdo.id, pdo.amount, pdo.pay_amount, pdo.order_ref, pdo.status, pdo.matched_deposit_id,
              pdo.created_at, pdo.expires_at,
              d.utr_number
       FROM pending_deposit_orders pdo
       LEFT JOIN deposits d ON d.id = pdo.matched_deposit_id
       WHERE pdo.user_id = ?
       ORDER BY pdo.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );

    // Resolve UPI for pending order enrichment
    const upiInfo = await resolveUpiForUser(req.user.id);
    const enrichedOrders = await Promise.all(orders.map(async (order) => {
      const o = { ...order };
      if (order.status === 'pending' && order.pay_amount && order.order_ref && upiInfo) {
        const payAmount = parseFloat(order.pay_amount);
        const { upiLink, qrDataUri, downloadQrUrl, downloadQrDataUri } = await buildQrPayload({
          orderId: order.id,
          orderRef: order.order_ref,
          upiId: upiInfo.upiId,
          payeeName: upiInfo.payeeName,
          payAmount,
          expiresAt: order.expires_at,
        });
        o.upi_id = upiInfo.upiId;
        o.payee_name = upiInfo.payeeName;
        o.upi_link = upiLink;
        o.qr_code = qrDataUri;
        o.download_qr_url = downloadQrUrl;
        o.download_qr_code = downloadQrDataUri;
      }
      return o;
    }));

    res.json({
      orders: enrichedOrders,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auto-deposit/order/:id/cancel
 * User cancels their pending deposit order
 */
exports.cancelOrder = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;

    await conn.beginTransaction();

    const [result] = await conn.query(
      "UPDATE pending_deposit_orders SET status = 'cancelled' WHERE id = ? AND user_id = ? AND status = 'pending'",
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Order not found or already processed.' });
    }

    await conn.commit();
    res.json({ message: 'Deposit order cancelled.' });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

exports.openProtectedQr = async (req, res, next) => {
  try {
    const payload = verifyQrLaunchToken(req.params.token);

    if (!payload?.oid || !payload?.ref || !payload?.upi || !payload?.amt || !payload?.exp) {
      return res.status(400).type('html').send(renderQrStatusPage({
        title: 'QR Invalid',
        message: 'This QR code is not valid anymore. Please generate a new QR from the deposit page.',
      }));
    }

    const [orders] = await pool.query(
      `SELECT id, order_ref, status, pay_amount, matched_deposit_id, expires_at
       FROM pending_deposit_orders
       WHERE id = ?
       LIMIT 1`,
      [payload.oid]
    );

    if (orders.length === 0) {
      return res.status(404).type('html').send(renderQrStatusPage({
        title: 'QR Invalid',
        message: 'This payment QR no longer exists. Please generate a new QR from the deposit page.',
      }));
    }

    const order = orders[0];
    const orderAmount = Number.parseFloat(order.pay_amount);
    const payloadAmount = Number.parseFloat(payload.amt);

    if (order.order_ref !== payload.ref || orderAmount !== payloadAmount) {
      return res.status(400).type('html').send(renderQrStatusPage({
        title: 'QR Invalid',
        message: 'This QR does not match the current payment order. Please generate a new QR.',
      }));
    }

    const now = new Date();
    const expiresAt = new Date(order.expires_at);
    const payloadExpiresAt = new Date(payload.exp);
    const isUsed = order.status === 'matched' || Boolean(order.matched_deposit_id);
    const isCancelled = order.status === 'cancelled';
    const isExpired = order.status === 'expired' || expiresAt <= now || payloadExpiresAt <= now;

    if (!isUsed && !isCancelled && isExpired && order.status === 'pending') {
      await pool.query(
        "UPDATE pending_deposit_orders SET status = 'expired' WHERE id = ? AND status = 'pending'",
        [order.id]
      );
    }

    if (isUsed) {
      return res.type('html').send(renderQrStatusPage({
        title: 'QR Already Used',
        message: 'This payment QR has already been used successfully. Please generate a new QR for another deposit.',
      }));
    }

    if (isCancelled || isExpired) {
      return res.type('html').send(renderQrStatusPage({
        title: 'QR Expired',
        message: 'This payment QR has expired or is no longer active. Please generate a new QR before paying.',
      }));
    }

    const upiLink = buildUpiLink({
      upiId: payload.upi,
      payeeName: payload.pn || '',
      amount: payloadAmount,
      orderRef: payload.ref,
    });

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res.redirect(302, upiLink);
  } catch (error) {
    next(error);
  }
};

// ========== ADMIN ENDPOINTS ==========

/**
 * GET /api/auto-deposit/admin/webhook-transactions
 * Admin views all incoming webhook transactions
 */
exports.getWebhookTransactions = async (req, res, next) => {
  try {
    const { status } = req.query;
    const { page, limit, offset } = clampPagination(req.query);

    let whereClause = '';
    const params = [];

    if (status) {
      whereClause = 'WHERE uwt.status = ?';
      params.push(status);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM upi_webhook_transactions uwt ${whereClause}`,
      params
    );

    const [transactions] = await pool.query(
      `SELECT uwt.id, uwt.amount, uwt.reference_number, uwt.payer_name, uwt.txn_time,
              uwt.status, uwt.error_message, uwt.matched_order_id, uwt.matched_deposit_id,
              uwt.created_at,
              CASE WHEN uwt.status IN ('parse_error','unmatched') THEN uwt.raw_message ELSE NULL END as raw_message,
              u.name as matched_user_name, u.phone as matched_user_phone
       FROM upi_webhook_transactions uwt
       LEFT JOIN pending_deposit_orders pdo ON pdo.id = uwt.matched_order_id
       LEFT JOIN users u ON u.id = pdo.user_id
       ${whereClause}
       ORDER BY uwt.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auto-deposit/admin/pending-orders
 * Admin views all pending deposit orders
 */
exports.getPendingOrders = async (req, res, next) => {
  try {
    const { status = 'pending' } = req.query;
    const { page, limit, offset } = clampPagination(req.query);

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM pending_deposit_orders WHERE status = ?',
      [status]
    );

    const [orders] = await pool.query(
      `SELECT pdo.id, pdo.user_id, pdo.amount, pdo.status, pdo.matched_deposit_id,
              pdo.created_at, pdo.expires_at,
              u.name as user_name, u.phone as user_phone
       FROM pending_deposit_orders pdo
       JOIN users u ON u.id = pdo.user_id
       WHERE pdo.status = ?
       ORDER BY pdo.created_at DESC
       LIMIT ? OFFSET ?`,
      [status, limit, offset]
    );

    res.json({
      orders,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auto-deposit/admin/logs
 * Admin views auto deposit audit logs
 */
exports.getAutoDepositLogs = async (req, res, next) => {
  try {
    const { page, limit, offset } = clampPagination(req.query);

    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM auto_deposit_logs');

    const [logs] = await pool.query(
      `SELECT adl.*, u.name as user_name, u.phone as user_phone
       FROM auto_deposit_logs adl
       LEFT JOIN users u ON u.id = adl.user_id
       ORDER BY adl.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auto-deposit/admin/stats
 * Admin dashboard stats for auto deposits
 */
exports.getStats = async (req, res, next) => {
  try {
    const [stats] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM pending_deposit_orders WHERE status = 'pending' AND expires_at > NOW()) as active_orders,
        (SELECT COUNT(*) FROM pending_deposit_orders WHERE status = 'matched' AND DATE(created_at) = CURDATE()) as matched_today,
        (SELECT COUNT(*) FROM pending_deposit_orders WHERE status = 'expired' AND DATE(created_at) = CURDATE()) as expired_today,
        (SELECT COALESCE(SUM(amount), 0) FROM pending_deposit_orders WHERE status = 'matched' AND DATE(created_at) = CURDATE()) as matched_amount_today,
        (SELECT COUNT(*) FROM upi_webhook_transactions WHERE DATE(created_at) = CURDATE()) as webhook_messages_today,
        (SELECT COUNT(*) FROM upi_webhook_transactions WHERE status = 'matched' AND DATE(created_at) = CURDATE()) as webhook_matched_today,
        (SELECT COUNT(*) FROM upi_webhook_transactions WHERE status = 'unmatched' AND DATE(created_at) = CURDATE()) as webhook_unmatched_today,
        (SELECT COUNT(*) FROM upi_webhook_transactions WHERE status = 'duplicate' AND DATE(created_at) = CURDATE()) as webhook_duplicate_today
    `);

    res.json(stats[0]);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auto-deposit/admin/expire-orders
 * Admin manually triggers order expiry cleanup
 */
/**
 * POST /api/auto-deposit/admin/orders/:id/cancel
 * Admin cancels any pending deposit order on behalf of the user.
 */
exports.adminCancelOrder = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT id, user_id, amount, status FROM pending_deposit_orders WHERE id = ? LIMIT 1 FOR UPDATE",
      [id]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (rows[0].status !== 'pending') {
      await conn.rollback();
      return res.status(409).json({ error: `Order is already ${rows[0].status} and cannot be cancelled.` });
    }

    await conn.query(
      "UPDATE pending_deposit_orders SET status = 'cancelled' WHERE id = ?",
      [id]
    );

    await conn.query(
      `INSERT INTO auto_deposit_logs (order_id, user_id, action, details)
       VALUES (?, ?, 'admin_cancelled', ?)`,
      [id, rows[0].user_id, JSON.stringify({ admin_id: adminId, amount: rows[0].amount })]
    );

    await conn.commit();
    res.json({ message: 'Order cancelled successfully.' });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

/**
 * POST /api/auto-deposit/admin/orders/:id/credit
 * Admin manually credits a pending deposit order when auto-match failed.
 */
exports.adminCreditOrder = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { utr_number } = req.body;
    const adminId = req.user.id;

    if (!utr_number || !String(utr_number).trim()) {
      return res.status(400).json({ error: 'UTR / reference number is required for manual credit.' });
    }

    const utr = String(utr_number).trim();

    await conn.beginTransaction();

    // Load order — allow crediting pending OR expired orders
    const [orders] = await conn.query(
      "SELECT id, user_id, amount, status FROM pending_deposit_orders WHERE id = ? AND status IN ('pending','expired') LIMIT 1 FOR UPDATE",
      [id]
    );

    if (orders.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Order not found or already matched/cancelled.' });
    }

    const order = orders[0];
    const creditAmount = Math.round(parseFloat(order.amount) * 100) / 100;

    // Duplicate UTR guard
    const [dupUtr] = await conn.query(
      'SELECT id FROM deposits WHERE utr_number = ? LIMIT 1',
      [utr]
    );
    if (dupUtr.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'This UTR number has already been used.' });
    }

    // Idempotency: ensure order not already credited
    const [dupOrder] = await conn.query(
      "SELECT id FROM deposits WHERE order_id = ? LIMIT 1",
      [id]
    );
    if (dupOrder.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'This order has already been credited.' });
    }

    // Create deposit record
    const [depositResult] = await conn.query(
      `INSERT INTO deposits (user_id, amount, utr_number, order_id, status)
       VALUES (?, ?, ?, ?, 'completed')`,
      [order.user_id, creditAmount, utr, id]
    );
    const depositId = depositResult.insertId;

    // Credit wallet
    const newBalance = await recordWalletTransaction(conn, {
      userId: order.user_id,
      type: 'deposit',
      amount: creditAmount,
      referenceType: 'deposit',
      referenceId: `deposit_${depositId}`,
      remark: `Manual deposit credit by admin (UTR: ${utr})`,
    });

    // Apply bonuses
    await applyDepositBonuses(conn, { depositId, userId: order.user_id, amount: creditAmount });

    // Mark order as matched
    await conn.query(
      "UPDATE pending_deposit_orders SET status = 'matched', matched_deposit_id = ? WHERE id = ?",
      [depositId, id]
    );

    // Notify user
    await conn.query(
      'INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)',
      [order.user_id, 'deposit', `Your deposit of ₹${creditAmount} has been manually verified and credited by admin. UTR: ${utr}`]
    );

    // Audit log
    await conn.query(
      `INSERT INTO auto_deposit_logs (order_id, deposit_id, user_id, action, details)
       VALUES (?, ?, ?, 'admin_manual_credit', ?)`,
      [id, depositId, order.user_id, JSON.stringify({ admin_id: adminId, amount: creditAmount, utr, new_balance: newBalance })]
    );

    await conn.commit();
    res.json({ message: `₹${creditAmount} credited successfully.`, deposit_id: depositId, new_balance: newBalance });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

exports.triggerExpireOrders = async (req, res, next) => {
  try {
    const expired = await expirePendingOrders();
    res.json({ message: `Expired ${expired} stale orders.`, expired_count: expired });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auto-deposit/admin/search-utr/:utr
 * Search webhook transactions by UTR / reference number.
 */
exports.searchByUtr = async (req, res, next) => {
  try {
    const utr = String(req.params.utr || '').trim();
    if (!utr || utr.length < 6) {
      return res.status(400).json({ error: 'Please provide at least 6 characters of the UTR.' });
    }

    // Search webhook transactions
    const [webhookRows] = await pool.query(
      `SELECT uwt.id, uwt.reference_number, uwt.amount, uwt.payer_name, uwt.status,
              uwt.raw_message, uwt.matched_order_id, uwt.created_at,
              pdo.order_ref
       FROM upi_webhook_transactions uwt
       LEFT JOIN pending_deposit_orders pdo ON pdo.id = uwt.matched_order_id
       WHERE uwt.reference_number LIKE ?
       ORDER BY uwt.created_at DESC
       LIMIT 20`,
      [`%${utr}%`]
    );

    // Also search existing deposits
    const [depositRows] = await pool.query(
      `SELECT d.id, d.user_id, d.amount, d.utr_number, d.status, d.created_at, u.phone, u.username
       FROM deposits d
       LEFT JOIN users u ON u.id = d.user_id
       WHERE d.utr_number LIKE ?
       ORDER BY d.created_at DESC
       LIMIT 20`,
      [`%${utr}%`]
    );

    res.json({ webhook_transactions: webhookRows, deposits: depositRows });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auto-deposit/admin/credit-by-utr
 * Admin credits a user's wallet using an unmatched webhook transaction.
 * Body: { webhook_transaction_id, user_id }
 */
exports.creditByUtr = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { webhook_transaction_id, user_id } = req.body;
    const adminId = req.user.id;

    if (!webhook_transaction_id || !user_id) {
      return res.status(400).json({ error: 'webhook_transaction_id and user_id are required.' });
    }

    await conn.beginTransaction();

    // Load the webhook transaction
    const [txnRows] = await conn.query(
      `SELECT id, reference_number, amount, payer_name, status, matched_order_id
       FROM upi_webhook_transactions WHERE id = ? FOR UPDATE`,
      [webhook_transaction_id]
    );

    if (txnRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Webhook transaction not found.' });
    }

    const txn = txnRows[0];

    if (txn.status === 'matched') {
      await conn.rollback();
      return res.status(409).json({ error: 'This transaction has already been matched.' });
    }

    const creditAmount = Math.round(parseFloat(txn.amount) * 100) / 100;
    const utr = txn.reference_number;

    if (!creditAmount || creditAmount <= 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'Transaction has invalid amount.' });
    }

    // Verify user exists
    const [userRows] = await conn.query('SELECT id FROM users WHERE id = ? LIMIT 1', [user_id]);
    if (userRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'User not found.' });
    }

    // Duplicate UTR guard
    const [dupUtr] = await conn.query('SELECT id FROM deposits WHERE utr_number = ? LIMIT 1', [utr]);
    if (dupUtr.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'This UTR has already been credited to a deposit.' });
    }

    // Create deposit record
    const [depositResult] = await conn.query(
      `INSERT INTO deposits (user_id, amount, utr_number, status)
       VALUES (?, ?, ?, 'completed')`,
      [user_id, creditAmount, utr]
    );
    const depositId = depositResult.insertId;

    // Credit wallet
    const newBalance = await recordWalletTransaction(conn, {
      userId: user_id,
      type: 'deposit',
      amount: creditAmount,
      referenceType: 'deposit',
      referenceId: `deposit_${depositId}`,
      remark: `Admin credit by UTR (UTR: ${utr})`,
    });

    // Apply bonuses
    await applyDepositBonuses(conn, { depositId, userId: user_id, amount: creditAmount });

    // Update webhook transaction status
    await conn.query(
      "UPDATE upi_webhook_transactions SET status = 'matched', matched_order_id = NULL WHERE id = ?",
      [webhook_transaction_id]
    );

    // Notify user
    await conn.query(
      'INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)',
      [user_id, 'deposit', `Your deposit of ₹${creditAmount} has been verified and credited. UTR: ${utr}`]
    );

    // Audit log
    await conn.query(
      `INSERT INTO auto_deposit_logs (deposit_id, user_id, action, details)
       VALUES (?, ?, 'admin_credit_by_utr', ?)`,
      [depositId, user_id, JSON.stringify({ admin_id: adminId, amount: creditAmount, utr, webhook_transaction_id, new_balance: newBalance })]
    );

    await conn.commit();
    res.json({ message: `₹${creditAmount} credited to user #${user_id}.`, deposit_id: depositId, new_balance: newBalance });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

/**
 * GET /api/auto-deposit/admin/unmatched-transactions
 * Fetch unmatched/received webhook transactions for admin review.
 */
exports.getUnmatchedTransactions = async (req, res, next) => {
  try {
    const { page, limit } = clampPagination(req.query);
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT uwt.id, uwt.reference_number, uwt.amount, uwt.payer_name, uwt.status,
              uwt.raw_message, uwt.matched_order_id, uwt.created_at,
              pdo.order_ref
       FROM upi_webhook_transactions uwt
       LEFT JOIN pending_deposit_orders pdo ON pdo.id = uwt.matched_order_id
       WHERE uwt.status IN ('unmatched', 'received')
       ORDER BY uwt.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) as total FROM upi_webhook_transactions WHERE status IN ('unmatched', 'received')"
    );

    res.json({ transactions: rows, total, page, limit });
  } catch (error) {
    next(error);
  }
};
