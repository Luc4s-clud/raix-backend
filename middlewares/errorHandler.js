/**
 * Middleware centralizado para tratamento de erros
 */
export function errorHandler(err, req, res, next) {
  console.error("❌ Erro:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Erro de validação
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      error: "Erro de validação",
      details: err.message,
    });
  }

  // Erro de banco de dados
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      success: false,
      error: "Registro duplicado",
      details: "Já existe um registro com esses dados.",
    });
  }

  // Erro de autenticação
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      error: "Erro de autenticação",
      details: err.name === "TokenExpiredError" 
        ? "Token expirado. Faça login novamente." 
        : "Token inválido.",
    });
  }

  // Erro padrão
  const statusCode = err.statusCode || 500;
  const message = err.message || "Erro interno do servidor.";

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

/**
 * Wrapper para async routes - captura erros automaticamente
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

