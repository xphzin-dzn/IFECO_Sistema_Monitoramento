const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

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
    // Tabela 1: TB_USUARIOS
    const tbUsuarios = `
        CREATE TABLE IF NOT EXISTS TB_USUARIOS (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            email VARCHAR(150) UNIQUE NOT NULL,
            senha_hash VARCHAR(255) NOT NULL,
            data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // Tabela 2: TB_SESSOES
    const tbSessoes = `
        CREATE TABLE IF NOT EXISTS TB_SESSOES (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            nome_pista VARCHAR(100),
            observacoes VARCHAR(200),
            data_inicio DATETIME,
            data_fim DATETIME,
            FOREIGN KEY (usuario_id) REFERENCES TB_USUARIOS(id)
        )
    `;

    // Tabela 3: TB_LEITURAS
    const tbLeituras = `
        CREATE TABLE IF NOT EXISTS TB_LEITURAS (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            sessao_id INT NOT NULL,
            timestamp DATETIME(3),
            velocidade FLOAT,
            tensao FLOAT,
            corrente FLOAT,
            temperatura FLOAT,
            FOREIGN KEY (sessao_id) REFERENCES TB_SESSOES(id) ON DELETE CASCADE
        )
    `;

    // Executa a criação das tabelas usando o pool oficial
    pool.query(tbUsuarios, (err) => {
        if (err) console.error("Erro TB_USUARIOS:", err);
        else {
            pool.query(`INSERT IGNORE INTO TB_USUARIOS (id, nome, email, senha_hash) VALUES (1, 'Admin', 'admin@ifeco.com', 'hash_simulado')`);
            
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

// --- ROTAS (Usando 'pool' em vez de 'db') ---

app.post('/api/save-session', async (req, res) => {
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