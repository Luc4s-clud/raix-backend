import bcrypt from "bcrypt";
import { pool } from "../db.js";

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.replace(/^--/, "");
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

async function createAdminUser() {
  try {
    const args = parseArgs(process.argv);
    const usuario = args.usuario || process.env.ADMIN_USER || "admin";
    const senha = args.senha || process.env.ADMIN_PASS || "admin123";
    const nome = args.nome || process.env.ADMIN_NAME || "Administrador";

    if (!usuario || !senha || !nome) {
      throw new Error("Usuário, senha e nome são obrigatórios.");
    }

    const hashSenha = await bcrypt.hash(senha, 10);

    await pool.query(
      `INSERT INTO administradores (usuario, senha, nome) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE senha=VALUES(senha), nome=VALUES(nome)`,
      [usuario, hashSenha, nome]
    );

    console.log("✅ Usuário admin criado/atualizado com sucesso!");
    console.log(`   Usuário: ${usuario}`);
    console.log("   ⚠️  IMPORTANTE: Guarde a senha com segurança.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao criar usuário admin:", error);
    process.exit(1);
  }
}

createAdminUser();

