import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import dotenv from "dotenv";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { loginRateLimiter } from "../middlewares/rateLimiter.js";
import {
  successResponse,
  validationErrorResponse,
  unauthorizedResponse,
  errorResponse,
} from "../utils/responseHelper.js";
import { validateRequired } from "../utils/validators.js";

dotenv.config();

const router = express.Router();

// Login
router.post(
  "/login",
  loginRateLimiter(),
  asyncHandler(async (req, res) => {
    const { usuario, senha } = req.body;

    // Valida campos obrigatórios
    const requiredValidation = validateRequired({ usuario, senha }, ["usuario", "senha"]);
    if (!requiredValidation.isValid) {
      return validationErrorResponse(res, "Usuário e senha são obrigatórios.");
    }

    // Busca o administrador
    const [rows] = await pool.query(
      "SELECT id, usuario, senha, nome FROM administradores WHERE usuario = ?",
      [usuario]
    );

    if (rows.length === 0) {
      return unauthorizedResponse(res, "Usuário ou senha inválidos.");
    }

    const admin = rows[0];

    // Verifica a senha
    const senhaValida = await bcrypt.compare(senha, admin.senha);
    if (!senhaValida) {
      return unauthorizedResponse(res, "Usuário ou senha inválidos.");
    }

    // Atualiza último acesso
    await pool.query("UPDATE administradores SET ultimo_acesso = NOW() WHERE id = ?", [admin.id]);

    // Gera token JWT
    const token = jwt.sign(
      { id: admin.id, usuario: admin.usuario, nome: admin.nome },
      process.env.JWT_SECRET || "raix-secret-key-change-in-production",
      { expiresIn: "8h" }
    );

    return successResponse(
      res,
      {
        token,
        admin: {
          id: admin.id,
          usuario: admin.usuario,
          nome: admin.nome,
        },
      },
      "Login realizado com sucesso"
    );
  })
);

// Verificar token (para validar se ainda está autenticado)
router.get(
  "/verify",
  asyncHandler(async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return unauthorizedResponse(res, "Token não fornecido.");
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
      return unauthorizedResponse(res, "Administrador não encontrado.");
    }

    return successResponse(res, {
      admin: {
        id: rows[0].id,
        usuario: rows[0].usuario,
        nome: rows[0].nome,
      },
    });
  })
);

export default router;

