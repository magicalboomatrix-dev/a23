const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate, optionalAuthenticate, authorize } = require('../middleware/auth.middleware');

// Public & User Notification Routes
router.get('/recent', notificationController.getRecentNotifications);
router.get('/my', authenticate, notificationController.getUserNotifications);
router.put('/:id/read', authenticate, notificationController.markRead);

// Web Push / VAPID Subscription Routes
router.get('/push/public-key', notificationController.getVapidPublicKey);
router.post('/push/subscribe', optionalAuthenticate, notificationController.subscribePush);
router.post('/push/unsubscribe', notificationController.unsubscribePush);

// Admin Push Management Routes
router.post('/push/broadcast', authenticate, authorize('admin'), notificationController.sendBroadcastPush);
router.get('/push/stats', authenticate, authorize('admin'), notificationController.getPushStats);

module.exports = router;
