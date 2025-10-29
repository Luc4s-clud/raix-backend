import { pool } from "../db.js";
import crypto from "crypto";

// Limites de geração de cupons
const MIN_COUPON = 0; // RAIX000000
const MAX_COUPON = 10000; // RAIX010000 (exclusive, então vai até 9999 = RAIX009999)

/**
 * Gera código de cupom no formato RAIX + número (6 dígitos)
 */
function formatCouponCode(number) {
  return "RAIX" + String(number).padStart(6, "0");
}

/**
 * Verifica se um cupom já existe no banco
 */
async function couponExists(codigo) {
  const [rows] = await pool.query("SELECT id FROM cupons WHERE codigo = ?", [codigo]);
  return rows.length > 0;
}

/**
 * Gera um número aleatório entre min e max (inclusive)
 */
function generateRandomNumber(min, max) {
  return crypto.randomInt(min, max + 1);
}

/**
 * Busca todos os cupons já gerados para verificar disponibilidade
 */
async function getExistingCoupons() {
  const [rows] = await pool.query(
    "SELECT codigo FROM cupons WHERE codigo LIKE 'RAIX%'"
  );
  return new Set(rows.map(row => row.codigo));
}

export async function gerarCupons(produtorId, notaId, qtd) {
  const gerados = [];
  const existingCoupons = await getExistingCoupons();
  let tentativas = 0;
  const maxTentativas = qtd * 100; // Limite de tentativas para evitar loop infinito

  // Verifica quantos cupons já foram gerados
  const cuponsDisponiveis = MAX_COUPON - existingCoupons.size;
  
  if (cuponsDisponiveis < qtd) {
    throw new Error(`Não há cupons suficientes disponíveis. Restam apenas ${cuponsDisponiveis} cupons na faixa de 0 a 10.000.`);
  }

  // Gera cupons aleatórios dentro da faixa de 0 a 10.000
  while (gerados.length < qtd) {
    // Gera número aleatório entre 0 e 9999
    const randomNumber = generateRandomNumber(MIN_COUPON, MAX_COUPON - 1);
    const codigo = formatCouponCode(randomNumber);

    // Verifica se o cupom já existe
    if (existingCoupons.has(codigo) || gerados.includes(codigo)) {
      tentativas++;
      if (tentativas > maxTentativas) {
        throw new Error("Falha ao gerar cupons únicos após múltiplas tentativas. Pode não haver cupons suficientes disponíveis.");
      }
      continue;
    }

    try {
      await pool.query(
        "INSERT INTO cupons (produtor_id, nota_id, codigo) VALUES (?, ?, ?)",
        [produtorId, notaId, codigo]
      );
      gerados.push(codigo);
      existingCoupons.add(codigo); // Adiciona ao set para evitar duplicatas nesta geração
      tentativas = 0; // Reseta tentativas após sucesso
    } catch (err) {
      // Código duplicado: tenta novamente
      if (err && err.code === "ER_DUP_ENTRY") {
        existingCoupons.add(codigo); // Adiciona ao set mesmo em caso de erro
        tentativas++;
        if (tentativas > maxTentativas) {
          throw new Error("Falha ao gerar cupons únicos após múltiplas tentativas.");
        }
        continue;
      }
      throw err;
    }
  }

  return gerados;
}
