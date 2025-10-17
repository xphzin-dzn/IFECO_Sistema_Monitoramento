const { pool } = require('../db');

const dataController = {
    // Salvar dados dos sensores
    saveData: async (req, res) => {
        try {
            console.log('📥 Dados recebidos:', req.body);
            
            const { dados } = req.body;
            const userId = req.user.userId;

            // Validação
            if (!dados || !Array.isArray(dados)) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos. Esperado array de leituras.',
                    received: req.body
                });
            }

            let savedCount = 0;

            // Inserir cada leitura no banco
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
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    },

    // Buscar dados recentes
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
                data: leituras.reverse() // Ordenar do mais antigo para o mais recente
            });

        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: error.message
            });
        }
    }
};

module.exports = dataController;