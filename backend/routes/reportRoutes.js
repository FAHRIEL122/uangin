const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/summary', reportController.getSummary);
router.get('/transactions', reportController.getTransactionList);
router.get('/categories', reportController.getCategoryBreakdown);
router.get('/budget', reportController.getBudgetStatus);
router.get('/insights', reportController.getInsights);
router.get('/monthly-trend', reportController.getMonthlyTrend);
router.get('/top-expenses', reportController.getTopExpenses);

module.exports = router;
