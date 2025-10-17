const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initializeDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARE MÍNIMO E FUNCIONAL
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ROTA DE REGISTRO DIRETA (PARA TESTE)
app.post('/api/registrar', async (req, res) => {
    try {
        console.log('🔍 REGISTER - Body recebido:', req.body);
        
        if (!req.body) {
            return res.status(400).json({ error: 'No body received' });
        }

        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ 
                error: 'Email and password required',
                received: req.body 
            });
        }

        // Aqui vai a lógica do banco...
        res.json({ 
            success: true, 
            message: 'Usuário registrado (teste)',
            email: email 
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor teste na porta ${PORT}`);
});