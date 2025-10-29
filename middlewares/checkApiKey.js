import dotenv from "dotenv";
dotenv.config();

export function checkApiKey(req, res, next) {
  const key = req.headers["x-api-key"];
  if (!key || key !== process.env.API_KEY) {
    return res.status(403).json({ error: "Acesso negado. API key inválida." });
  }
  next();
}
