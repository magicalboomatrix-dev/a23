const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/users', authenticate, authorize('admin', 'moderator'), adminController.listUsers);
router.put('/users/:id/block', authenticate, authorize('admin'), adminController.blockUser);
router.get('/settings', authenticate, authorize('admin'), adminController.getSettings);
router.put('/settings', authenticate, authorize('admin'), adminController.updateSettings);
router.get('/flagged-accounts', authenticate, authorize('admin'), adminController.getFlaggedAccounts);

module.exports = router;
