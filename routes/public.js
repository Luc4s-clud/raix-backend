import express from "express";
import multer from "multer";
import fs from "fs";
import crypto from "crypto";
import { pool } from "../db.js";
import { salvarArquivo } from "../services/storageService.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("arquivo"), async (req, res) => {
  try {
    const { nome, cpf_cnpj, email, telefone, qtde_sacas } = req.body;
    const arquivo = req.file;

    if (!arquivo)
      return res.status(400).json({ error: "Arquivo obrigatório (PDF ou PNG)." });

    // Verifica tipo de arquivo
    const tipo = arquivo.mimetype;
    if (!["application/pdf", "image/png"].includes(tipo)) {
      fs.unlinkSync(arquivo.path); // remove o arquivo inválido
      return res.status(400).json({ error: "Formato inválido. Envie apenas PDF ou PNG." });
    }

    // Verifica ou cria produtor
    const [prod] = await pool.query("SELECT id FROM produtores WHERE cpf_cnpj = ?", [cpf_cnpj]);
    let produtorId = prod.length ? prod[0].id : null;

    if (!produtorId) {
      const [r] = await pool.query(
        "INSERT INTO produtores (nome, cpf_cnpj, email, telefone) VALUES (?, ?, ?, ?)",
        [nome, cpf_cnpj, email, telefone]
      );
      produtorId = r.insertId;
    }

    // Salva o arquivo
    const objKey = await salvarArquivo(arquivo, nome);

    await pool.query(
      `INSERT INTO notas_fiscais (produtor_id, xml_obj_key, qtde_sacas, status)
       VALUES (?, ?, ?, 'EM_ANALISE')`,
      [produtorId, objKey, qtde_sacas]
    );

    res.json({ success: true, message: "Cadastro recebido com sucesso! Aguarde validação da Raíx." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao cadastrar participação." });
  }
});

export default router;
