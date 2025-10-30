import dotenv from "dotenv";
dotenv.config();

import { enviarEmailCupons } from "../services/emailService.js";

async function main() {
  const destinatario = process.argv[2];
  if (!destinatario) {
    console.error("Uso: node scripts/testEmail.js <email-destino>");
    process.exit(1);
  }

  try {
    await enviarEmailCupons({
      nome: "Teste",
      email: destinatario,
      cupons: ["CUPOM-TESTE-123", "CUPOM-TESTE-456"],
    });
    console.log("✅ Envio de teste concluído.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Falha ao enviar e-mail:", err);
    process.exit(1);
  }
}

main();


