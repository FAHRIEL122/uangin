const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Tag CRUD
router.get('/', tagController.getTags);
router.post('/', tagController.createTag);
router.put('/:id', tagController.updateTag);
router.delete('/:id', tagController.deleteTag);

// Transaction tags
router.post('/transaction/:transactionId', tagController.addTagToTransaction);
router.delete('/transaction/:transactionId/tag/:tagId', tagController.removeTagFromTransaction);
router.get('/transaction/:transactionId', tagController.getTransactionTags);

module.exports = router;
