const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', goalController.getGoals);
router.post('/', goalController.createGoal);
router.put('/:id', goalController.updateGoal);
router.post('/:id/progress', goalController.addProgress);
router.delete('/:id', goalController.deleteGoal);

module.exports = router;
