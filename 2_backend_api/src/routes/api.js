const express = require('express');
const userController = require('../controllers/userController');
const dataController = require('../controllers/dataController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Rotas públicas
router.post('/registrar', userController.register);
router.post('/login', userController.login);

// Rotas protegidas (requerem autenticação)
router.post('/dados', authenticateToken, dataController.saveData);
router.get('/dados/recentes', authenticateToken, dataController.getRecentData);

// Rota de saúde da API
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API IFECO funcionando',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

module.exports = router;