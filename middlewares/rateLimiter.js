/**
 * Rate limiting middleware simples
 * Para produção, considere usar express-rate-limit ou redis
 */

const rateLimitStore = new Map();

export function rateLimiter(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const record = rateLimitStore.get(key);

    // Reset se a janela expirou
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }

    // Incrementa contador
    record.count++;

    // Verifica limite
    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: "Muitas requisições. Tente novamente mais tarde.",
      });
    }

    next();
  };
}

// Rate limiter específico para login (mais restritivo)
export function loginRateLimiter() {
  return rateLimiter(5, 15 * 60 * 1000); // 5 tentativas a cada 15 minutos
}

// Rate limiter para rotas públicas
export function publicRateLimiter() {
  return rateLimiter(50, 15 * 60 * 1000); // 50 requisições a cada 15 minutos
}

