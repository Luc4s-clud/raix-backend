import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import { validateEnv } from "./utils/envValidator.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import publicRoutes from "./routes/public.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import notasRoutes from "./routes/notas.js";
import adminUsersRoutes from "./routes/adminUsers.js";

dotenv.config();

// Valida variáveis de ambiente antes de iniciar
validateEnv();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Limite de tamanho para uploads
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));
app.use("/uploads", express.static("uploads"));

// Rotas
app.use("/participar", publicRoutes);
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/admin/notas", notasRoutes);
app.use("/admin/users", adminUsersRoutes);

// Rota de health check
app.get("/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "Servidor funcionando",
    timestamp: new Date().toISOString() 
  });
});

// Middleware de tratamento de erros (deve ser o último)
app.use(errorHandler);

// Tratamento de rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Rota não encontrada",
  });
});

const PORT = process.env.PORT || 4015;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`📝 Ambiente: ${process.env.NODE_ENV || "development"}`);
});
