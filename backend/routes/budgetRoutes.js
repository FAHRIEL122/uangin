// Budget Routes
const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', budgetController.getBudgets);
router.post('/', budgetController.setBudget);
router.delete('/:id', budgetController.deleteBudget);
router.get('/check-warning', budgetController.checkBudgetWarning);

module.exports = router;
