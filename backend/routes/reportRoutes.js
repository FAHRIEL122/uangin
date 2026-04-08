// Report Routes
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/summary', reportController.getMonthlySummary);
router.get('/transactions', reportController.getTransactionDetail);
router.get('/categories', reportController.getCategorySummary);
router.get('/insights', reportController.getInsights);
router.get('/budget', reportController.getBudgetReport);

module.exports = router;
