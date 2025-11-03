import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Decide automaticamente o modo "secure" conforme a porta, permitindo override por env
const smtpPort = Number(process.env.SMTP_PORT) || 587; // default STARTTLS
const envSecure = process.env.SMTP_SECURE;
const smtpSecure = typeof envSecure === "string"
  ? envSecure.toLowerCase() === "true"
  : smtpPort === 465; // 465 = SMTPS (secure: true), 587 = STARTTLS (secure: false)

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpSecure,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendEmail({ to, subject, html }) {
  // Preferir Resend API quando a chave estiver definida (evita bloqueios SMTP no provedor)
  if (process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV !== "test") {
      console.log("📧 Modo de envio: Resend API");
    }
    const from = process.env.RESEND_FROM || `Campanha Raíx <onboarding@resend.dev>`;

    // Em ambientes não-prod, permitir redirecionar todos os envios para um e-mail de teste
    const isProduction = process.env.NODE_ENV === "production";
    const testRedirectTo = process.env.RESEND_TEST_REDIRECT_TO || process.env.DEV_EMAIL;
    const originalTo = to;
    if (!isProduction && testRedirectTo) {
      to = testRedirectTo;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");

      // Se for o erro de testes da Resend (403) e houver SMTP configurado, fazer fallback automático
      const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
      if (response.status === 403 && hasSmtp) {
        console.warn("Resend retornou 403 (provável modo de testes). Fazendo fallback para SMTP...");
        await transporter.sendMail({
          from: `Campanha Raíx <${process.env.SMTP_USER}>`,
          to: originalTo,
          subject,
          html,
        });
        return;
      }

      throw new Error(`Resend API error: ${response.status} ${text}`);
    }
    return;
  }

  // Fallback: SMTP (funciona quando portas não estão bloqueadas)
  if (process.env.NODE_ENV !== "test") {
    console.log(
      `📧 Modo de envio: SMTP host=${process.env.SMTP_HOST} port=${smtpPort} secure=${smtpSecure}`
    );
  }
  await transporter.sendMail({
    from: `Campanha Raíx <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

export async function enviarEmailCupons({ nome, email, cupons }) {
  const lista = cupons.map(c => `<li>${c}</li>`).join("");

  const html = `
    <h3>Olá, ${nome}!</h3>
    <p>Sua Nota Fiscal foi validada com sucesso pela equipe Raíx.</p>
    <p>Você recebeu <b>${cupons.length}</b> cupons:</p>
    <ul>${lista}</ul>
    <p>Boa sorte 🍀<br>Equipe Raíx 🌱</p>
  `;

  await sendEmail({
    to: email,
    subject: "🎉 Seus cupons da campanha Raíx estão prontos!",
    html,
  });

  console.log(`✅ E-mail enviado para ${email}`);
}

export async function enviarEmailReprovacao({ nome, email, motivo }) {
  const html = `
    <h3>Olá, ${nome}!</h3>
    <p>Sua Nota Fiscal foi analisada pela equipe Raíx, porém <b>não foi aprovada</b>.</p>
    <p><b>Motivo da reprovação:</b> ${motivo || "Motivo não informado"}</p>
    <p>Você pode reenviar uma nova nota corrigindo o problema.</p>
    <p>Qualquer dúvida, estamos à disposição.<br>Equipe Raíx 🌱</p>
  `;

  await sendEmail({
    to: email,
    subject: "Sua participação na campanha Raíx foi reprovada",
    html,
  });

  console.log(`✅ E-mail de reprovação enviado para ${email}`);
}