const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
// const bodyParser = require('body-parser'); // Removido
require('dotenv').config();

// IMPORTAR O CONTROLLER DE USUÁRIO (necessário para a rota de login e registro)
const userController = require('./src/controllers/userController');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
// 1. Utilizando apenas o express.json() para ler o corpo da requisição
app.use(express.json({ limit: '50mb' }));

// Configuração básica (sem o banco de dados inicialmente para garantir a conexão)
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
};

const DB_NAME = process.env.DB_NAME || 'ifeco_monitoramento';

// Variável global para o Pool
let pool;

// Função para inicializar o banco e tabelas
const initDB = () => {
    // 1. Cria uma conexão temporária sem banco especificado para poder criar o CREATE DATABASE
    const tempConnection = mysql.createConnection({
        ...dbConfig
    });

    tempConnection.connect((err) => {
        if (err) {
            console.error('Erro ao conectar ao MySQL:', err);
            return;
        }

        console.log('Conectado ao MySQL para verificação inicial...');

        // 2. Cria o banco se não existir
        tempConnection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`, (err) => {
            if (err) throw err;
            console.log(`Banco '${DB_NAME}' verificado/criado.`);

            // 3. Encerra a conexão temporária
            tempConnection.end();

            // 4. Agora sim, cria o POOL OFICIAL conectado ao banco correto
            pool = mysql.createPool({
                ...dbConfig,
                database: DB_NAME
            });

            console.log('Pool de conexões oficial iniciado.');
            createTables();
        });
    });
};

const createTables = () => {
    // Tabela 1: TB_USUARIOS (sintaxe corrigida)
    const tbUsuarios = `CREATE TABLE IF NOT EXISTS TB_USUARIOS (
id INT AUTO_INCREMENT PRIMARY KEY,
nome VARCHAR(100) NOT NULL,
email VARCHAR(150) UNIQUE NOT NULL,
senha_hash VARCHAR(255) NOT NULL,
data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

    // Tabela 2: TB_SESSOES (sintaxe corrigida)
    const tbSessoes = `CREATE TABLE IF NOT EXISTS TB_SESSOES (
id INT AUTO_INCREMENT PRIMARY KEY,
usuario_id INT NOT NULL,
nome_pista VARCHAR(100),
observacoes VARCHAR(200),
data_inicio DATETIME,
data_fim DATETIME,
FOREIGN KEY (usuario_id) REFERENCES TB_USUARIOS(id)
)`;

    // Tabela 3: TB_LEITURAS (sintaxe corrigida)
    const tbLeituras = `CREATE TABLE IF NOT EXISTS TB_LEITURAS (
id BIGINT AUTO_INCREMENT PRIMARY KEY,
sessao_id INT NOT NULL,
timestamp DATETIME(3),
velocidade FLOAT,
tensao FLOAT,
corrente FLOAT,
temperatura FLOAT,
FOREIGN KEY (sessao_id) REFERENCES TB_SESSOES(id) ON DELETE CASCADE
)`;

    // Executa a criação das tabelas usando o pool oficial
    pool.query(tbUsuarios, (err) => {
        if (err) console.error("Erro TB_USUARIOS:", err);
        else {
            // Uso de um hash bcrypt válido para o usuário demo
            const demoHash = '$2a$10$w3U6hLpL8K2p9j9Yy7jG.u/d5qG7Fp1Z0Y/lG8M1c0pE0c7c3c5xU'; // Senha simulada 'admin123'
            pool.query(`INSERT IGNORE INTO TB_USUARIOS (id, nome, email, senha_hash) VALUES (1, 'Admin', 'admin@ifeco.com', '${demoHash}')`);

            pool.query(tbSessoes, (err) => {
                if (err) console.error("Erro TB_SESSOES:", err);
                else {
                    pool.query(tbLeituras, (err) => {
                        if (err) console.error("Erro TB_LEITURAS:", err);
                        else console.log(">> SUCESSO: Todas as tabelas estão prontas!");
                    });
                }
            });
        }
    });
};

// Inicializa tudo
initDB();

// --- ROTAS ---

// 2. INJEÇÃO DA ROTA DE LOGIN (CRÍTICO PARA O ERRO 404)
app.post('/api/login', userController.login);

// ROTA DE REGISTRO (Já estava aqui, mas garantida)
app.post('/api/register', userController.register);

app.post('/api/save-session', async (req, res) => {
    // Lógica de salvar sessão
    const { usuario_id, nome_pista, observacoes, data_inicio, data_fim, leituras } = req.body;

    if (!leituras || leituras.length === 0) {
        return res.status(400).send('Nenhum dado para salvar.');
    }

    try {
        const uid = usuario_id || 1;

        const [sessaoResult] = await pool.promise().query(
            'INSERT INTO TB_SESSOES (usuario_id, nome_pista, observacoes, data_inicio, data_fim) VALUES (?, ?, ?, ?, ?)',
            [uid, nome_pista || 'Pista Padrão', observacoes || '', new Date(data_inicio), new Date(data_fim)]
        );

        const sessaoId = sessaoResult.insertId;

        const values = leituras.map(l => [
            sessaoId,
            new Date(l.timestamp),
            l.velocidade ?? null,
            l.tensao ?? null,
            l.corrente ?? null,
            l.temperatura ?? null
        ]);

        const sql = 'INSERT INTO TB_LEITURAS (sessao_id, timestamp, velocidade, tensao, corrente, temperatura) VALUES ?';

        await pool.promise().query(sql, [values]);

        console.log(`Sessão ${sessaoId} salva com ${leituras.length} leituras.`);
        res.json({ success: true, sessionId: sessaoId });

    } catch (error) {
        console.error('Erro ao salvar:', error);
        res.status(500).send('Erro interno: ' + error.message);
    }
});

app.get('/api/sessions', async (req, res) => {
    // Lógica de obter sessões
    try {
        const query = `
            SELECT s.*, u.nome as nome_piloto 
            FROM TB_SESSOES s
            JOIN TB_USUARIOS u ON s.usuario_id = u.id
            ORDER BY s.id DESC LIMIT 10
        `;
        const [rows] = await pool.promise().query(query);
        res.json(rows);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get('/api/session/:id', async (req, res) => {
    // Lógica de obter detalhes da sessão
    const { id } = req.params;
    try {
        const [readings] = await pool.promise().query(
            'SELECT * FROM TB_LEITURAS WHERE sessao_id = ? ORDER BY timestamp ASC',
            [id]
        );
        res.json(readings);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});