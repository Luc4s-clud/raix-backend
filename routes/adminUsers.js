import express from "express";
import { pool } from "../db.js";
import { checkAuth } from "../middlewares/checkAuth.js";
import bcrypt from "bcrypt";

const router = express.Router();

// GET /admin/users → lista todos os administradores
router.get("/", checkAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, usuario, nome, criado_em, ultimo_acesso
      FROM administradores
      ORDER BY criado_em DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar administradores." });
  }
});

// GET /admin/users/:id → obtém um administrador específico
router.get("/:id", checkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT id, usuario, nome, criado_em, ultimo_acesso 
       FROM administradores WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Administrador não encontrado." });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar administrador." });
  }
});

// POST /admin/users → cria um novo administrador
router.post("/", checkAuth, async (req, res) => {
  try {
    const { usuario, senha, nome } = req.body;

    if (!usuario || !senha || !nome) {
      return res.status(400).json({ error: "Usuário, senha e nome são obrigatórios." });
    }

    if (senha.length < 6) {
      return res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres." });
    }

    // Verifica se o usuário já existe
    const [existing] = await pool.query(
      "SELECT id FROM administradores WHERE usuario = ?",
      [usuario]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Usuário já existe." });
    }

    // Gera hash da senha
    const hashSenha = await bcrypt.hash(senha, 10);

    // Insere o administrador
    const [result] = await pool.query(
      `INSERT INTO administradores (usuario, senha, nome) VALUES (?, ?, ?)`,
      [usuario, hashSenha, nome]
    );

    res.status(201).json({
      success: true,
      id: result.insertId,
      message: "Administrador criado com sucesso!"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar administrador." });
  }
});

// PUT /admin/users/:id → atualiza um administrador
router.put("/:id", checkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, senha } = req.body;

    if (!nome) {
      return res.status(400).json({ error: "Nome é obrigatório." });
    }

    // Verifica se o administrador existe
    const [existing] = await pool.query(
      "SELECT id FROM administradores WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: "Administrador não encontrado." });
    }

    // Se senha foi fornecida, atualiza também
    if (senha) {
      if (senha.length < 6) {
        return res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres." });
      }
      const hashSenha = await bcrypt.hash(senha, 10);
      await pool.query(
        `UPDATE administradores SET nome = ?, senha = ? WHERE id = ?`,
        [nome, hashSenha, id]
      );
    } else {
      await pool.query(
        `UPDATE administradores SET nome = ? WHERE id = ?`,
        [nome, id]
      );
    }

    res.json({ success: true, message: "Administrador atualizado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar administrador." });
  }
});

// DELETE /admin/users/:id → deleta um administrador
router.delete("/:id", checkAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Não permite deletar a si mesmo
    if (req.admin.id === parseInt(id)) {
      return res.status(400).json({ error: "Você não pode deletar seu próprio usuário." });
    }

    // Verifica se o administrador existe
    const [existing] = await pool.query(
      "SELECT id, usuario FROM administradores WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: "Administrador não encontrado." });
    }

    await pool.query("DELETE FROM administradores WHERE id = ?", [id]);

    res.json({ success: true, message: "Administrador deletado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao deletar administrador." });
  }
});

export default router;

