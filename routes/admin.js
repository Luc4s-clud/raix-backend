import express from "express";
import { pool } from "../db.js";
import { gerarCupons } from "../services/cupomService.js";
import { enviarEmailCupons, enviarEmailReprovacao } from "../services/emailService.js";
import { exportarExcel } from "../services/excelService.js";
import { checkApiKey } from "../middlewares/checkApiKey.js";
import { checkAuth } from "../middlewares/checkAuth.js";

const router = express.Router();

/* Aprovar NF */
router.patch("/aprovar/:id", checkAuth, async (req, res) => {
  const notaId = req.params.id;
  try {
    const [rows] = await pool.query(
      `SELECT n.*, p.nome, p.email 
       FROM notas_fiscais n JOIN produtores p ON p.id = n.produtor_id
       WHERE n.id=? AND n.status='EM_ANALISE'`, [notaId]
    );

    if (!rows.length) return res.status(404).json({ error: "Nota não encontrada ou já processada." });
    const nota = rows[0];

    await pool.query(`UPDATE notas_fiscais SET status='APROVADA' WHERE id=?`, [notaId]);

    const cupons = await gerarCupons(nota.produtor_id, nota.id, nota.qtde_sacas);
    await enviarEmailCupons({ nome: nota.nome, email: nota.email, cupons });

    res.json({ success: true, cupons });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao aprovar nota." });
  }
});

/* Reprovar NF */
router.patch("/reprovar/:id", checkAuth, async (req, res) => {
  const notaId = req.params.id;
  const { motivo } = req.body;
  try {
    const [rows] = await pool.query(
      `SELECT n.*, p.nome, p.email 
       FROM notas_fiscais n JOIN produtores p ON p.id = n.produtor_id
       WHERE n.id=? AND n.status='EM_ANALISE'`, [notaId]
    );

    if (!rows.length) return res.status(404).json({ error: "Nota não encontrada ou já processada." });
    const nota = rows[0];

    await pool.query(
      `UPDATE notas_fiscais SET status='REPROVADA', motivo_reprovacao=? WHERE id=? AND status='EM_ANALISE'`,
      [motivo || "Motivo não informado", notaId]
    );

    await enviarEmailReprovacao({ nome: nota.nome, email: nota.email, motivo });

    res.json({ success: true, message: "Nota reprovada e e-mail enviado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao reprovar nota." });
  }
});

/* Exportar Excel */
router.get("/export/excel", checkAuth, async (req, res) => {
  try {
    const [dados] = await pool.query(`
      SELECT 
        p.nome, p.cpf_cnpj, p.email, p.telefone,
        n.id AS id_nota, n.qtde_sacas, n.status, n.motivo_reprovacao,
        COUNT(c.id) AS cupons_gerados, n.criado_em
      FROM notas_fiscais n
      JOIN produtores p ON p.id = n.produtor_id
      LEFT JOIN cupons c ON c.nota_id = n.id
      GROUP BY n.id
      ORDER BY n.criado_em DESC;
    `);
    const buffer = await exportarExcel(dados);
    res.setHeader("Content-Disposition", "attachment; filename=raix_participacoes.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao exportar planilha." });
  }
});

/* Listar cupons */
router.get("/cupons", checkAuth, async (req, res) => {
  try {
    const { nota_id } = req.query;
    let query = `
      SELECT c.id, c.codigo, c.criado_em, p.nome, p.email, p.cpf_cnpj, n.id AS nota_id, n.qtde_sacas
      FROM cupons c
      JOIN produtores p ON p.id = c.produtor_id
      JOIN notas_fiscais n ON n.id = c.nota_id
      WHERE n.status='APROVADA'
    `;
    
    const params = [];
    if (nota_id) {
      query += " AND n.id = ?";
      params.push(nota_id);
    }
    
    query += " ORDER BY c.id ASC";
    
    const [cupons] = await pool.query(query, params);
    res.json(cupons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar cupons." });
  }
});

export default router;
