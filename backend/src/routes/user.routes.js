const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/profile', authenticate, userController.getProfile);
router.get('/bank-accounts', authenticate, userController.getBankAccounts);
router.post('/bank-accounts', authenticate, userController.addBankAccount);
router.delete('/bank-accounts/:id', authenticate, userController.deleteBankAccount);
router.get('/account-statement', authenticate, userController.getAccountStatement);
router.get('/profit-loss', authenticate, userController.getProfitLoss);

module.exports = router;
