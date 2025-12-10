const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Importa o pool de conexões (essencial para o BD)
const { pool } = require('../db');

const userController = {
    register: async (req, res) => {
        try {
            // 1. CORRIGIDO: Incluir 'nome' na extração (vem do frontend)
            const { nome, email, senha } = req.body;

            // 2. Validação para campos obrigatórios
            if (!nome || !email || !senha) {
                return res.status(400).json({
                    success: false,
                    message: 'Nome, e-mail e senha são obrigatórios'
                });
            }

            // 3. Checar se o usuário já existe (usando a tabela correta TB_USUARIOS)
            const [existingUsers] = await pool.execute(
                'SELECT id FROM TB_USUARIOS WHERE email = ?',
                [email]
            );

            if (existingUsers.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Usuário já existe'
                });
            }

            // 4. Hash da Senha (Segurança Essencial)
            const saltRounds = 10;
            const senhaHash = await bcrypt.hash(senha, saltRounds);

            // 5. CORRIGIDO: Inserir em TB_USUARIOS, usando 'nome' e 'senha_hash'
            const [result] = await pool.execute(
                'INSERT INTO TB_USUARIOS (nome, email, senha_hash) VALUES (?, ?, ?)',
                [nome, email, senhaHash]
            );

            res.status(201).json({
                success: true,
                message: 'Usuário registrado com sucesso',
                userId: result.insertId
            });

        } catch (error) {
            // Log do erro completo no terminal do Node.js
            console.error('ERRO CRÍTICO no registro (userController):', error);
            // Retorna erro 500 para o frontend
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor ao tentar registrar.'
            });
        }
    },

    login: async (req, res) => {
        try {
            const { email, senha } = req.body;

            if (!email || !senha) {
                return res.status(400).json({
                    success: false,
                    message: 'Email e senha são obrigatórios'
                });
            }

            if (!process.env.JWT_SECRET) {
                return res.status(500).json({
                    success: false,
                    message: 'Configuração do servidor incompleta'
                });
            }

            // 1. Buscar na TB_USUARIOS, incluindo 'nome' e 'senha_hash'
            const [users] = await pool.execute(
                'SELECT id, nome, email, senha_hash FROM TB_USUARIOS WHERE email = ?',
                [email]
            );

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciais inválidas'
                });
            }

            const user = users[0];

            // 2. Comparar a senha bruta com o HASH armazenado em user.senha_hash
            const senhaValida = await bcrypt.compare(senha, user.senha_hash);
            if (!senhaValida) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciais inválidas'
                });
            }

            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );

            res.json({
                success: true,
                message: 'Login realizado com sucesso',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    nome: user.nome // Incluído o nome do usuário
                }
            });

        } catch (error) {
            console.error('Erro no login:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }
};

module.exports = userController;