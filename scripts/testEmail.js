import dotenv from "dotenv";
dotenv.config();

async function main() {
  const destinatario = process.argv[2];
  if (!destinatario) {
    console.error("Uso: node scripts/testEmail.js <email-destino>");
    process.exit(1);
  }

  try {
    // Força SMTP Office365 para este teste
    process.env.RESEND_API_KEY = ""; // garante que Resend não será usada
    process.env.SMTP_HOST = "smtp-legacy.office365.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_SECURE = "false"; // STARTTLS
    process.env.SMTP_USER = "contato@raixbiosolucoes.com.br";
    process.env.SMTP_PASS = "djpnywdqdmtvzqrt";

    // Importa após definir variáveis, para que o transporter use os valores acima
    const { enviarEmailCupons } = await import("../services/emailService.js");

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


