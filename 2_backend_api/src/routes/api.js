const express = require('express');
const userController = require('../controllers/userController');
const dataController = require('../controllers/dataController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

router.get('/health', dataController.getHealth);
router.post('/registrar', userController.register);
router.post('/login', userController.login);
router.post('/dados', authenticateToken, dataController.saveData);
router.get('/dados/recentes', authenticateToken, dataController.getRecentData);

module.exports = router;