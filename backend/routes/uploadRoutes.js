const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, uploadController.uploadFile);

module.exports = router;
