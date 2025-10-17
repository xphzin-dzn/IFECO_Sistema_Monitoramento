const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: 'Token de acesso necessário' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false,
                message: 'Token inválido ou expirado' 
            });
        }
        
        req.user = user; // Adiciona informações do usuário à requisição
        next();
    });
};

module.exports = authenticateToken;