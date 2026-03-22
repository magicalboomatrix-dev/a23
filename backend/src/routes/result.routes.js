const express = require('express');
const router = express.Router();
const resultController = require('../controllers/result.controller');

router.get('/monthly', resultController.getMonthlyResults);
router.get('/yearly', resultController.getYearlyResults);
router.get('/live', resultController.getLiveResults);

module.exports = router;
