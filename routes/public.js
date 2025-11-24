import express from "express";
import multer from "multer";
import fs from "fs";
import { pool } from "../db.js";
import { salvarArquivo } from "../services/storageService.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { publicRateLimiter } from "../middlewares/rateLimiter.js";
import { successResponse, validationErrorResponse } from "../utils/responseHelper.js";
import { validateRequired, validateEmail, validateCPFCNPJ } from "../utils/validators.js";

const router = express.Router();

// Configuração do multer com validações
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Formato inválido. Envie apenas PDF, JPG ou PNG."), false);
    }
  },
});

router.post(
  "/",
  publicRateLimiter(),
  upload.single("arquivo"),
  asyncHandler(async (req, res) => {
    const { nome, cpf_cnpj, email, telefone, qtde_sacas } = req.body;
    const arquivo = req.file;

    // Validações
    if (!arquivo) {
      return validationErrorResponse(res, "Arquivo obrigatório (PDF, JPG ou PNG).");
    }

    // Valida campos obrigatórios
    const requiredValidation = validateRequired(
      { nome, cpf_cnpj, email, telefone, qtde_sacas },
      ["nome", "cpf_cnpj", "email", "telefone", "qtde_sacas"]
    );

    if (!requiredValidation.isValid) {
      return validationErrorResponse(
        res,
        "Campos obrigatórios faltando",
        requiredValidation.missing
      );
    }

    // Valida email
    if (!validateEmail(email)) {
      return validationErrorResponse(res, "Email inválido.");
    }

    // Valida CPF/CNPJ
    if (!validateCPFCNPJ(cpf_cnpj)) {
      return validationErrorResponse(res, "CPF ou CNPJ inválido.");
    }

    // Valida quantidade de sacas
    const qtdeSacasNum = parseInt(qtde_sacas);
    if (isNaN(qtdeSacasNum) || qtdeSacasNum <= 0) {
      return validationErrorResponse(res, "Quantidade de sacas deve ser um número positivo.");
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
      [produtorId, objKey, qtdeSacasNum]
    );

    return successResponse(
      res,
      null,
      "Cadastro recebido com sucesso! Aguarde validação da Raíx."
    );
  })
);

export default router;
