'use strict';

const webpush = require('web-push');
const pool = require('../config/database');
const logger = require('../utils/logger');
const eventBus = require('../utils/event-bus');

class PushNotificationService {
  constructor() {
    this.initialized = false;
    this.publicKey = process.env.VAPID_PUBLIC_KEY || '';
    this.privateKey = process.env.VAPID_PRIVATE_KEY || '';
    this.subject = process.env.VAPID_SUBJECT || 'mailto:admin@a23satta.com';
    this.init();
  }

  init() {
    if (this.publicKey && this.privateKey) {
      try {
        webpush.setVapidDetails(this.subject, this.publicKey, this.privateKey);
        this.initialized = true;
        logger.info('push-notification', 'WebPush VAPID initialized successfully');
      } catch (err) {
        logger.error('push-notification', 'Failed to initialize WebPush VAPID', err);
      }
    } else {
      logger.warn('push-notification', 'VAPID keys not configured in environment variables');
    }
  }

  getPublicKey() {
    return this.publicKey;
  }

  /**
   * Save or update a push subscription from frontend/app
   */
  async saveSubscription({ userId = null, endpoint, p256dh, auth, userAgent = null }) {
    if (!endpoint || !p256dh || !auth) {
      throw new Error('Endpoint, p256dh and auth are required for push subscription');
    }

    const [result] = await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         user_id = COALESCE(VALUES(user_id), user_id),
         p256dh = VALUES(p256dh),
         auth = VALUES(auth),
         user_agent = VALUES(user_agent),
         updated_at = CURRENT_TIMESTAMP`,
      [userId ? parseInt(userId, 10) : null, endpoint, p256dh, auth, userAgent]
    );

    return result;
  }

  /**
   * Remove a push subscription (e.g. user revoked permission or endpoint expired)
   */
  async removeSubscription(endpoint) {
    if (!endpoint) return;
    try {
      await pool.query('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
    } catch (err) {
      logger.warn('push-notification', 'Failed to remove subscription', { endpoint, error: err.message });
    }
  }

  /**
   * Send notification to a single subscription object
   */
  async sendToSubscription(sub, payload) {
    if (!this.initialized) {
      logger.warn('push-notification', 'Cannot send push: service not initialized');
      return false;
    }

    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    const notificationPayload = JSON.stringify({
      title: payload.title || 'A23 Notification',
      body: payload.body || '',
      icon: payload.icon || '/icons/a23_icon_192.png',
      badge: payload.badge || '/icons/a23_icon_72.png',
      image: payload.image || undefined,
      url: payload.url || '/',
      tag: payload.tag || 'general',
      data: payload.data || { url: payload.url || '/' },
      timestamp: Date.now(),
    });

    try {
      await webpush.sendNotification(pushSubscription, notificationPayload, {
        TTL: 24 * 60 * 60, // 24 hours
        urgency: payload.urgency || 'high',
      });
      return true;
    } catch (error) {
      // 404 or 410 indicates the subscription is no longer active / unsubscribed
      if (error.statusCode === 404 || error.statusCode === 410) {
        await this.removeSubscription(sub.endpoint);
        logger.info('push-notification', `Cleaned expired subscription: ${sub.endpoint.slice(0, 45)}...`);
      } else {
        logger.warn('push-notification', 'Push notification delivery error', {
          statusCode: error.statusCode,
          message: error.message,
        });
      }
      return false;
    }
  }

  /**
   * Send push notification to ALL subscribers (Broadcast / Results)
   */
  async sendToAll(payload, { adminId = null, notificationType = 'broadcast' } = {}) {
    if (!this.initialized) {
      logger.warn('push-notification', 'Push service not initialized');
      return { total: 0, success: 0, failure: 0 };
    }

    try {
      const [subscriptions] = await pool.query(
        'SELECT id, endpoint, p256dh, auth, user_id FROM push_subscriptions'
      );

      const total = subscriptions.length;
      if (total === 0) {
        logger.info('push-notification', 'No active push subscriptions found');
        return { total: 0, success: 0, failure: 0 };
      }

      let successCount = 0;
      let failureCount = 0;

      // Process in batches of 25 to avoid overwhelming the network
      const BATCH_SIZE = 25;
      for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
        const batch = subscriptions.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((sub) => this.sendToSubscription(sub, payload))
        );

        results.forEach((res) => {
          if (res.status === 'fulfilled' && res.value === true) {
            successCount += 1;
          } else {
            failureCount += 1;
          }
        });
      }

      // Record in broadcast history
      try {
        await pool.query(
          `INSERT INTO push_broadcast_logs 
           (admin_id, title, message, url, notification_type, success_count, failure_count)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            adminId,
            payload.title || '',
            payload.body || '',
            payload.url || '/',
            notificationType,
            successCount,
            failureCount,
          ]
        );
      } catch (logErr) {
        logger.warn('push-notification', 'Failed to log broadcast to DB', { error: logErr.message });
      }

      logger.info('push-notification', `Push broadcast sent: ${successCount} succeeded, ${failureCount} failed out of ${total}`);
      return { total, success: successCount, failure: failureCount };
    } catch (err) {
      logger.error('push-notification', 'Error sending push to all', err);
      return { total: 0, success: 0, failure: 0, error: err.message };
    }
  }

  /**
   * Send result notification when admin declares/posts a result
   */
  async sendResultNotification({ gameId, gameName = null, resultNumber, resultDate }) {
    try {
      let resolvedGameName = gameName;
      if (!resolvedGameName && gameId) {
        const [games] = await pool.query('SELECT name FROM games WHERE id = ?', [gameId]);
        if (games.length > 0) {
          resolvedGameName = games[0].name;
        }
      }

      const finalGameName = resolvedGameName || 'Game';
      const formattedResult = String(resultNumber).padStart(2, '0');

      // Title & body matching user's request and competitor example:
      // "Faridabad Result 29"
      const title = `${finalGameName} Result ${formattedResult}`;
      const body = `${finalGameName} का रिजल्ट ${formattedResult} घोषित हो चुका है! तुरंत चेक करें।`;

      const payload = {
        title,
        body,
        icon: '/icons/a23_icon_192.png',
        badge: '/icons/a23_icon_72.png',
        url: '/results',
        tag: `result-${gameId}-${resultDate}`,
        data: {
          url: '/results',
          type: 'result',
          gameId,
          resultNumber: formattedResult,
          resultDate,
        },
      };

      // Also insert into notifications table as 'result' for in-app history/ticker
      try {
        await pool.query(
          'INSERT INTO notifications (user_id, type, message) VALUES (NULL, ?, ?)',
          ['result', `${finalGameName} Result: ${formattedResult} (${resultDate})`]
        );
      } catch (nErr) {
        logger.warn('push-notification', 'Failed to save result notification in notifications table', nErr.message);
      }

      return await this.sendToAll(payload, { notificationType: 'result' });
    } catch (err) {
      logger.error('push-notification', 'Error sending result notification', err);
    }
  }

  /**
   * Listen to event-bus result_declared
   */
  registerEventListeners() {
    eventBus.on('result_declared', async ({ gameId, gameName = null, resultDate, resultNumber }) => {
      logger.info('push-notification', `Triggering push for result: gameId=${gameId}, result=${resultNumber}`);
      await this.sendResultNotification({ gameId, gameName, resultDate, resultNumber });
    });
  }
}

const pushNotificationService = new PushNotificationService();
pushNotificationService.registerEventListeners();

module.exports = pushNotificationService;
