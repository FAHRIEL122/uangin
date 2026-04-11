const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file CSV yang diperbolehkan'));
    }
  }
});

router.use(authenticate);

// Download template
router.get('/template', importController.getImportTemplate);

// Import CSV
router.post('/csv', upload.single('file'), importController.importCSV);

module.exports = router;
