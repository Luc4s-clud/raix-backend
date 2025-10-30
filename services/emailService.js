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

export async function enviarEmailCupons({ nome, email, cupons }) {
  const lista = cupons.map(c => `<li>${c}</li>`).join("");

  const html = `
    <h3>Olá, ${nome}!</h3>
    <p>Sua Nota Fiscal foi validada com sucesso pela equipe Raíx.</p>
    <p>Você recebeu <b>${cupons.length}</b> cupons:</p>
    <ul>${lista}</ul>
    <p>Boa sorte 🍀<br>Equipe Raíx 🌱</p>
  `;

  await transporter.sendMail({
    from: `"Campanha Raíx" <${process.env.SMTP_USER}>`,
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

  await transporter.sendMail({
    from: `"Campanha Raíx" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Sua participação na campanha Raíx foi reprovada",
    html,
  });

  console.log(`✅ E-mail de reprovação enviado para ${email}`);
}