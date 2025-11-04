import nodemailer from "nodemailer";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import dotenv from "dotenv";
dotenv.config();

// Decide automaticamente o modo "secure" conforme a porta, permitindo override por env
const smtpPort = Number(process.env.SMTP_PORT) || 587; // default STARTTLS
const envSecure = process.env.SMTP_SECURE;
const smtpSecure = typeof envSecure === "string"
  ? envSecure.toLowerCase() === "true"
  : smtpPort === 465; // 465 = SMTPS (secure: true), 587 = STARTTLS (secure: false)

// Timeouts configuráveis com defaults seguros
const connectionTimeout = Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 15000);
const greetingTimeout = Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000);
const socketTimeout = Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 20000);

// requireTLS por padrão para Office365
const isOffice365 = typeof process.env.SMTP_HOST === "string" && process.env.SMTP_HOST.includes("office365.com");
const requireTLS = (process.env.SMTP_REQUIRE_TLS || (isOffice365 ? "true" : "false")).toLowerCase() === "true";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpSecure,
  requireTLS,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  connectionTimeout,
  greetingTimeout,
  socketTimeout,
  tls: {
    minVersion: "TLSv1.2",
  },
});

async function sendEmail({ to, subject, html, text }) {
  // Prioridade 1: AWS SES via API (HTTPS - funciona em qualquer PaaS)
  if (process.env.AWS_SES_ACCESS_KEY_ID && process.env.AWS_SES_SECRET_ACCESS_KEY) {
    if (process.env.NODE_ENV !== "test") {
      console.log("📧 Modo de envio: AWS SES API");
    }
    const region = process.env.AWS_REGION || "us-east-1";
    const from = process.env.SES_FROM || "Campanha Raíx <no-reply@raixbiosolucoes.com.br>";
    
    // Remove espaços extras das credenciais (pode acontecer ao copiar/colar)
    const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID.trim();
    const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY.trim();
    
    if (process.env.NODE_ENV !== "test") {
      console.log(`🔧 AWS SES Config - Region: ${region}, From: ${from}, AccessKey: ${accessKeyId.substring(0, 8)}...`);
    }
    
    const sesClient = new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    try {
      const messageBody = {
        Html: { Data: html, Charset: "UTF-8" },
      };
      
      // Adiciona versão texto se fornecida (melhora deliverability)
      if (text) {
        messageBody.Text = { Data: text, Charset: "UTF-8" };
      }

      const command = new SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: messageBody,
        },
      });

      await sesClient.send(command);
      return;
    } catch (err) {
      // Se falhar, continua para próxima opção (Resend ou SMTP)
      console.error(`❌ AWS SES Error: ${err.name} - ${err.message}`);
      if (err.message.includes("signature") || err.message.includes("credentials")) {
        console.error("⚠️ Dica: Verifique se AWS_SES_ACCESS_KEY_ID e AWS_SES_SECRET_ACCESS_KEY estão corretos e se AWS_REGION está configurado corretamente (deve ser 'sa-east-1' se verificou em São Paulo)");
      }
      console.warn("AWS SES falhou, tentando próximo método...");
    }
  }

  // Prioridade 2: Resend API quando a chave estiver definida (evita bloqueios SMTP no provedor)
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
      body: JSON.stringify({ from, to, subject, html, ...(text && { text }) }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");

      // Se for o erro de testes da Resend (403) e houver SMTP configurado, fazer fallback automático
      const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
      if (response.status === 403 && hasSmtp) {
        console.warn("Resend retornou 403 (provável modo de testes). Fazendo fallback para SMTP...");
        await transporter.sendMail({
          from: `Campanha Raíx <${process.env.SMTP_USER}>`,
          to: originalTo,
          subject,
          html,
          ...(text && { text }),
        });
        return;
      }

      throw new Error(`Resend API error: ${response.status} ${errorText}`);
    }
    return;
  }

  // Fallback: SMTP (funciona quando portas não estão bloqueadas)
  if (process.env.NODE_ENV !== "test") {
    console.log(
      `📧 Modo de envio: SMTP host=${process.env.SMTP_HOST} port=${smtpPort} secure=${smtpSecure}`
    );
  }
  try {
    await transporter.sendMail({
      from: `Campanha Raíx <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      ...(text && { text }),
    });
  } catch (err) {
    // Retry automático: se for timeout com host legacy da Office365, tenta host moderno
    const host = process.env.SMTP_HOST || "";
    const isLegacyO365 = host.includes("smtp-legacy.office365.com");
    const isTimeout = err && (err.code === "ETIMEDOUT" || err.command === "CONN");
    if (isLegacyO365 && isTimeout) {
      const altHost = "smtp.office365.com";
      console.warn(`Conexão SMTP timeout em ${host}. Tentando novamente em ${altHost}...`);
      const retryTransporter = nodemailer.createTransport({
        host: altHost,
        port: smtpPort,
        secure: smtpSecure,
        requireTLS: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        connectionTimeout,
        greetingTimeout,
        socketTimeout,
        tls: { minVersion: "TLSv1.2" },
      });
      await retryTransporter.sendMail({
        from: `Campanha Raíx <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        ...(text && { text }),
      });
      return;
    }
    throw err;
  }
}

export async function enviarEmailCupons({ nome, email, cupons }) {
  const lista = cupons.map(c => `<li style="margin: 8px 0;"><strong>${c}</strong></li>`).join("");
  const listaTexto = cupons.map(c => `- ${c}`).join("\n");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #28a745; margin-top: 0;">Olá, ${nome}!</h2>
        <p style="font-size: 16px;">Sua Nota Fiscal foi <strong>validada com sucesso</strong> pela equipe Raíx.</p>
      </div>
      
      <div style="background-color: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px;">
        <p style="font-size: 16px; margin-bottom: 15px;">Você recebeu <strong>${cupons.length}</strong> cupons:</p>
        <ul style="list-style: none; padding-left: 0;">
          ${lista}
        </ul>
      </div>
      
      <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
        Boa sorte! 🍀<br>
        <strong>Equipe Raíx</strong> 🌱
      </p>
      
      <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
      <p style="color: #6c757d; font-size: 12px; text-align: center;">
        Este é um e-mail transacional da campanha Raíx. Você está recebendo porque sua nota fiscal foi aprovada.
      </p>
    </body>
    </html>
  `;

  const texto = `
Olá, ${nome}!

Sua Nota Fiscal foi validada com sucesso pela equipe Raíx.

Você recebeu ${cupons.length} cupons:

${listaTexto}

Boa sorte!
Equipe Raíx 🌱

---
Este é um e-mail transacional da campanha Raíx.
  `.trim();

  await sendEmail({
    to: email,
    subject: "🎉 Seus cupons da campanha Raíx estão prontos!",
    html,
    text: texto,
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