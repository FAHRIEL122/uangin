// Transaction Routes
const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', transactionController.getTransactions);
router.get('/all', transactionController.getAllTransactions);
router.post('/undo', transactionController.undoLastTransaction);
router.post('/', transactionController.createTransaction);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;
