const { pool } = require('../db');

const dataController = {
    getHealth: async (req, res) => {
        try {
            const [result] = await pool.execute('SELECT 1 as health');
            res.json({
                success: true,
                message: 'API e banco de dados funcionando',
                database: result[0].health === 1 ? 'conectado' : 'erro',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erro na verificação de saúde',
                error: error.message
            });
        }
    },

    saveData: async (req, res) => {
        try {
            const { dados } = req.body;
            const userId = req.user.userId;

            if (!dados || !Array.isArray(dados)) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos. Esperado array de leituras.'
                });
            }

            let savedCount = 0;

            for (const leitura of dados) {
                try {
                    await pool.execute(
                        `INSERT INTO leituras 
                         (tensao, corrente, velocidade, temperatura, data_hora, usuario_id) 
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            leitura.tensao || 0,
                            leitura.corrente || 0,
                            leitura.velocidade || 0,
                            leitura.temperatura || 0,
                            leitura.data_hora || new Date().toISOString(),
                            userId
                        ]
                    );
                    savedCount++;
                } catch (insertError) {
                    console.error('Erro ao inserir leitura:', insertError);
                }
            }

            res.json({
                success: true,
                message: `${savedCount} leituras salvas com sucesso`,
                savedCount
            });

        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    },

    getRecentData: async (req, res) => {
        try {
            const userId = req.user.userId;
            const limit = parseInt(req.query.limit) || 50;

            const [leituras] = await pool.execute(
                `SELECT 
                    tensao, 
                    corrente, 
                    velocidade, 
                    temperatura, 
                    data_hora 
                 FROM leituras 
                 WHERE usuario_id = ? 
                 ORDER BY data_hora DESC 
                 LIMIT ?`,
                [userId, limit]
            );

            res.json({
                success: true,
                data: leituras.reverse()
            });

        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }
};

module.exports = dataController;