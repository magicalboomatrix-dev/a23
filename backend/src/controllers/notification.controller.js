const pool = require('../config/database');
const pushNotificationService = require('../services/push-notification.service');
const logger = require('../utils/logger');

function maskName(name) {
  const safe = String(name || '').trim();
  if (!safe) return 'User****';
  if (safe.length <= 2) return `${safe.charAt(0)}****`;
  return `${safe.slice(0, Math.min(4, safe.length))}****`;
}

exports.getRecentNotifications = async (req, res, next) => {
  try {
    // Get recent win and result notifications (for public ticker).
    const [notifications] = await pool.query(`
      SELECT n.id, n.type, n.message, n.created_at, u.name as user_name
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.type IN ('win', 'result')
      ORDER BY n.created_at DESC LIMIT 20
    `);
    res.json({
      notifications: notifications.map((n) => ({
        ...n,
        user_name: n.user_name ? maskName(n.user_name) : null,
      })),
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserNotifications = async (req, res, next) => {
  try {
    const [notifications] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ notifications });
  } catch (error) {
    next(error);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id = ?',
      [req.user.id, req.params.id]);
    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get VAPID Public Key for client-side subscription
 */
exports.getVapidPublicKey = async (req, res) => {
  res.json({
    publicKey: pushNotificationService.getPublicKey(),
  });
};

/**
 * Subscribe a device (PWA / TWA / Browser) for push notifications
 */
exports.subscribePush = async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Valid subscription object is required.' });
    }

    const userId = req.user ? req.user.id : null;
    const userAgent = req.headers['user-agent'] || null;

    await pushNotificationService.saveSubscription({
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    });

    res.json({ message: 'Successfully subscribed to push notifications.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Unsubscribe a device
 */
exports.unsubscribePush = async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await pushNotificationService.removeSubscription(endpoint);
    }
    res.json({ message: 'Successfully unsubscribed from push notifications.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin broadcast push notification to all users (Offers, Game Timing, Announcements)
 */
exports.sendBroadcastPush = async (req, res, next) => {
  try {
    const { title, message, url, type = 'broadcast' } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Notification title and message are required.' });
    }

    const payload = {
      title: title.trim(),
      body: message.trim(),
      icon: '/icons/a23_icon_192.png',
      badge: '/icons/a23_icon_72.png',
      url: url || '/',
      tag: `broadcast-${Date.now()}`,
      data: {
        url: url || '/',
        type,
      },
    };

    // Save in in-app notifications table so all users can see it in app too
    await pool.query(
      'INSERT INTO notifications (user_id, type, message) VALUES (NULL, ?, ?)',
      ['broadcast', `${title}: ${message}`]
    );

    // Send push notification to all subscribed devices
    const stats = await pushNotificationService.sendToAll(payload, {
      adminId: req.user.id,
      notificationType: type,
    });

    res.json({
      message: 'Broadcast notification initiated successfully.',
      stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin view push notification subscriber count and broadcast logs
 */
exports.getPushStats = async (req, res, next) => {
  try {
    const [[{ total_subscribers }]] = await pool.query(
      'SELECT COUNT(*) AS total_subscribers FROM push_subscriptions'
    );

    const [logs] = await pool.query(
      `SELECT l.*, u.name AS admin_name 
       FROM push_broadcast_logs l
       LEFT JOIN users u ON l.admin_id = u.id
       ORDER BY l.created_at DESC LIMIT 20`
    );

    res.json({
      total_subscribers: Number(total_subscribers || 0),
      logs,
    });
  } catch (error) {
    next(error);
  }
};
