import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// Login
router.post("/login", async (req, res) => {
  try {
    const { usuario, senha } = req.body;

    if (!usuario || !senha) {
      return res.status(400).json({ error: "Usuário e senha são obrigatórios." });
    }

    // Busca o administrador
    const [rows] = await pool.query(
      "SELECT id, usuario, senha, nome FROM administradores WHERE usuario = ?",
      [usuario]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Usuário ou senha inválidos." });
    }

    const admin = rows[0];

    // Verifica a senha
    const senhaValida = await bcrypt.compare(senha, admin.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: "Usuário ou senha inválidos." });
    }

    // Atualiza último acesso
    await pool.query(
      "UPDATE administradores SET ultimo_acesso = NOW() WHERE id = ?",
      [admin.id]
    );

    // Gera token JWT
    const token = jwt.sign(
      { id: admin.id, usuario: admin.usuario, nome: admin.nome },
      process.env.JWT_SECRET || "raix-secret-key-change-in-production",
      { expiresIn: "8h" }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        usuario: admin.usuario,
        nome: admin.nome,
      },
    });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ error: "Erro ao realizar login." });
  }
});

// Verificar token (para validar se ainda está autenticado)
router.get("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Token não fornecido." });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "raix-secret-key-change-in-production"
    );

    // Verifica se o administrador ainda existe
    const [rows] = await pool.query(
      "SELECT id, usuario, nome FROM administradores WHERE id = ?",
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Administrador não encontrado." });
    }

    res.json({
      success: true,
      admin: {
        id: rows[0].id,
        usuario: rows[0].usuario,
        nome: rows[0].nome,
      },
    });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token inválido ou expirado." });
    }
    res.status(500).json({ error: "Erro ao verificar token." });
  }
});

export default router;

