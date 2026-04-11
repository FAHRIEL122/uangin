const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { triggerRecurring } = require('../utils/recurringProcessor');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

router.get('/', transactionController.getTransactions);
router.get('/all', transactionController.getAllTransactions);
router.post('/', transactionController.createTransaction);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);
router.post('/undo', transactionController.undoTransaction);
router.post('/process-recurring', triggerRecurring);

// Recycle Bin (Soft Delete)
router.get('/archive', transactionController.getArchivedTransactions);
router.post('/:id/restore', transactionController.restoreTransaction);
router.delete('/:id/permanent', transactionController.permanentDeleteTransaction);

module.exports = router;
