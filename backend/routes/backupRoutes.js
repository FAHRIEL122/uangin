// Backup Routes
const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/', backupController.getBackup);

module.exports = router;
