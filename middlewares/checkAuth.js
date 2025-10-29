import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export function checkAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "") || 
                  req.headers["x-api-key"]; // Mantém compatibilidade com API key antiga

    if (!token) {
      return res.status(401).json({ error: "Token de autenticação não fornecido." });
    }

    // Verifica se é JWT ou API key antiga
    if (token === process.env.API_KEY) {
      // Mantém compatibilidade com API key antiga
      return next();
    }

    // Verifica JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "raix-secret-key-change-in-production"
    );

    // Adiciona informações do admin à requisição
    req.admin = {
      id: decoded.id,
      usuario: decoded.usuario,
      nome: decoded.nome,
    };

    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Token inválido." });
    }
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado. Faça login novamente." });
    }
    return res.status(401).json({ error: "Erro ao validar autenticação." });
  }
}

