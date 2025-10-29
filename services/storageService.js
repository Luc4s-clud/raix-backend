import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function salvarArquivo(file, produtorNome) {
  const ext = path.extname(file.originalname).toLowerCase();
  const nomeLimpo = produtorNome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_");

  const nomeFinal = `${nomeLimpo}_${uuidv4()}${ext}`;
  const destino = path.join("uploads", nomeFinal);

  await fs.promises.rename(file.path, destino);
  return nomeFinal;
}
