const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/csv', exportController.exportCSV);
router.get('/excel', exportController.exportExcel);

module.exports = router;
