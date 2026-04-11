const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, backupController.exportData);

module.exports = router;
