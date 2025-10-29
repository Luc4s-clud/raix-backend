import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import publicRoutes from "./routes/public.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import notasRoutes from "./routes/notas.js";
import adminUsersRoutes from "./routes/adminUsers.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use("/uploads", express.static("uploads"));

app.use("/participar", publicRoutes);
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/admin/notas", notasRoutes);
app.use("/admin/users", adminUsersRoutes);

const PORT = process.env.PORT || 4015;
app.listen(PORT, () => console.log(`✅ Servidor rodando na porta ${PORT}`));
