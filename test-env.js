import dotenv from "dotenv";
dotenv.config();

console.log("🔍 Teste de leitura do .env");
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASS:", process.env.DB_PASS ? "OK" : "VAZIA");
console.log("DB_NAME:", process.env.DB_NAME);
