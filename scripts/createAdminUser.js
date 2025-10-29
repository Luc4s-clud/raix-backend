import bcrypt from "bcrypt";
import { pool } from "../db.js";

async function createAdminUser() {
  try {
    const usuario = "admin";
    const senha = "admin123";
    const nome = "Administrador";

    // Gera hash da senha
    const hashSenha = await bcrypt.hash(senha, 10);

    // Insere o administrador
    await pool.query(
      `INSERT INTO administradores (usuario, senha, nome) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE senha=VALUES(senha), nome=VALUES(nome)`,
      [usuario, hashSenha, nome]
    );

    console.log("✅ Usuário admin criado com sucesso!");
    console.log(`   Usuário: ${usuario}`);
    console.log(`   Senha: ${senha}`);
    console.log("   ⚠️  IMPORTANTE: Altere a senha após o primeiro acesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao criar usuário admin:", error);
    process.exit(1);
  }
}

createAdminUser();

