const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const userController = {
    // Registrar novo usuário
    register: async (req, res) => {
        try {
            console.log('📥 Body recebido:', req.body);
            
            const { email, senha } = req.body;

            // Validação básica
            if (!email || !senha) {
                return res.status(400).json({
                    success: false,
                    message: 'Email e senha são obrigatórios',
                    received: req.body
                });
            }

            // Verificar se usuário já existe
            const [existingUsers] = await pool.execute(
                'SELECT id FROM usuarios WHERE email = ?',
                [email]
            );

            if (existingUsers.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Usuário já existe'
                });
            }

            // Hash da senha
            const saltRounds = 10;
            const senhaHash = await bcrypt.hash(senha, saltRounds);

            // Inserir novo usuário
            const [result] = await pool.execute(
                'INSERT INTO usuarios (email, senha) VALUES (?, ?)',
                [email, senhaHash]
            );

            res.status(201).json({
                success: true,
                message: 'Usuário registrado com sucesso',
                userId: result.insertId
            });

        } catch (error) {
            console.error('Erro no registro:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    },

    // Login do usuário
    login: async (req, res) => {
        try {
            console.log('📥 Body recebido no login:', req.body);
            
            const { email, senha } = req.body;

            // Validação básica
            if (!email || !senha) {
                return res.status(400).json({
                    success: false,
                    message: 'Email e senha são obrigatórios'
                });
            }

            // Buscar usuário
            const [users] = await pool.execute(
                'SELECT * FROM usuarios WHERE email = ?',
                [email]
            );

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciais inválidas'
                });
            }

            const user = users[0];

            // Verificar senha
            const senhaValida = await bcrypt.compare(senha, user.senha);
            if (!senhaValida) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciais inválidas'
                });
            }

            // Gerar token JWT
            const token = jwt.sign(
                { 
                    userId: user.id, 
                    email: user.email 
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            res.json({
                success: true,
                message: 'Login realizado com sucesso',
                token,
                user: {
                    id: user.id,
                    email: user.email
                }
            });

        } catch (error) {
            console.error('Erro no login:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }
};

module.exports = userController;