import dotenv from "dotenv";
dotenv.config();

/**
 * Valida variáveis de ambiente obrigatórias no startup
 */
export function validateEnv() {
  const required = [
    "DB_HOST",
    "DB_USER",
    "DB_PASS",
    "DB_NAME",
    "JWT_SECRET",
  ];

  const missing = [];
  const warnings = [];

  // Verifica variáveis obrigatórias
  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Verifica JWT_SECRET padrão (security warning)
  if (process.env.JWT_SECRET === "raix-secret-key-change-in-production") {
    warnings.push("⚠️  JWT_SECRET está usando o valor padrão. Altere em produção!");
  }

  if (missing.length > 0) {
    console.error("❌ Variáveis de ambiente obrigatórias faltando:");
    missing.forEach((varName) => console.error(`   - ${varName}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    warnings.forEach((warning) => console.warn(warning));
  }

  console.log("✅ Variáveis de ambiente validadas");
}

