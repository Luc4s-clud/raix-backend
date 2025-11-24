/**
 * Utilitários para padronizar respostas da API
 */

export function successResponse(res, data = null, message = null, statusCode = 200) {
  const response = {
    success: true,
    ...(data && { data }),
    ...(message && { message }),
  };
  return res.status(statusCode).json(response);
}

export function errorResponse(res, message = "Erro ao processar requisição", statusCode = 500) {
  return res.status(statusCode).json({
    success: false,
    error: message,
  });
}

export function validationErrorResponse(res, message = "Dados inválidos", details = null) {
  return res.status(400).json({
    success: false,
    error: message,
    ...(details && { details }),
  });
}

export function notFoundResponse(res, resource = "Recurso") {
  return res.status(404).json({
    success: false,
    error: `${resource} não encontrado.`,
  });
}

export function unauthorizedResponse(res, message = "Não autorizado") {
  return res.status(401).json({
    success: false,
    error: message,
  });
}

