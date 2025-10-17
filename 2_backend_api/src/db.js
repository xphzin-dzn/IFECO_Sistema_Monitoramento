const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ifeco_monitor',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Criar pool de conexões
const pool = mysql.createPool(dbConfig);

// Testar conexão ao inicializar
const initializeDatabase = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conectado ao banco de dados MySQL');
        connection.release();
    } catch (error) {
        console.error('❌ Erro ao conectar com o banco de dados:', error.message);
        console.log('💡 Dica: Verifique se o MySQL está rodando e se o banco ifeco_monitor existe');
        process.exit(1);
    }
};

module.exports = { pool, initializeDatabase };