import express from "express";
import { pool } from "../db.js";
import { checkAuth } from "../middlewares/checkAuth.js";

const router = express.Router();

// GET /admin/notas → lista todas as notas cadastradas com contagem de cupons
router.get("/", checkAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        n.id,
        p.nome AS produtor,
        p.email,
        p.telefone,
        p.cpf_cnpj,
        n.qtde_sacas,
        n.status,
        n.xml_obj_key AS arquivo_xml,
        n.motivo_reprovacao,
        n.criado_em,
        COUNT(c.id) AS cupons_count
      FROM notas_fiscais n
      JOIN produtores p ON p.id = n.produtor_id
      LEFT JOIN cupons c ON c.nota_id = n.id
      GROUP BY n.id
      ORDER BY n.criado_em DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar notas." });
  }
});

// GET /admin/notas/stats → estatísticas avançadas
router.get("/stats", checkAuth, async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'APROVADA' THEN 1 ELSE 0 END) AS aprovadas,
        SUM(CASE WHEN status = 'REPROVADA' THEN 1 ELSE 0 END) AS reprovadas,
        SUM(CASE WHEN status = 'EM_ANALISE' THEN 1 ELSE 0 END) AS em_analise,
        SUM(qtde_sacas) AS total_sacas,
        COUNT(DISTINCT produtor_id) AS total_produtores,
        (SELECT COUNT(*) FROM cupons) AS total_cupons
      FROM notas_fiscais
    `);

    const [porDia] = await pool.query(`
      SELECT 
        DATE(criado_em) AS data,
        COUNT(*) AS quantidade,
        SUM(CASE WHEN status = 'APROVADA' THEN 1 ELSE 0 END) AS aprovadas,
        SUM(CASE WHEN status = 'REPROVADA' THEN 1 ELSE 0 END) AS reprovadas,
        SUM(CASE WHEN status = 'EM_ANALISE' THEN 1 ELSE 0 END) AS em_analise
      FROM notas_fiscais
      WHERE criado_em >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(criado_em)
      ORDER BY data DESC
    `);

    res.json({
      ...stats[0],
      porDia
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar estatísticas." });
  }
});

export default router;
