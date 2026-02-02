/**
 * Express ミドルウェア - 認証、レート制限、エラーハンドリング
 */

import { RATE_LIMIT } from '../shared/constants.js';

/**
 * レート制限のためのインメモリストア
 * 本番環境ではRedisを使用すべき
 */
const rateLimitStore = new Map();

/**
 * レート制限をクリーンアップ（古いエントリを削除）
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.windowStart > RATE_LIMIT.WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  }
}

// 5分ごとにクリーンアップ
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);

/**
 * レート制限ミドルウェア
 * @param {Object} options
 * @param {number} options.maxRequests - ウィンドウ内の最大リクエスト数
 * @param {number} options.windowMs - ウィンドウサイズ（ミリ秒）
 * @param {string} options.keyPrefix - レート制限キーのプレフィックス
 */
export function rateLimit({ maxRequests = RATE_LIMIT.MAX_REQUESTS, windowMs = RATE_LIMIT.WINDOW_MS, keyPrefix = 'default' } = {}) {
  return (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${clientIp}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now - record.windowStart > windowMs) {
      record = { count: 1, windowStart: now };
      rateLimitStore.set(key, record);
      setRateLimitHeaders(res, maxRequests, maxRequests - 1, windowMs);
      return next();
    }

    record.count++;

    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.windowStart + windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      setRateLimitHeaders(res, maxRequests, 0, windowMs);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'リクエスト数の上限に達しました。しばらく待ってから再試行してください。',
        retryAfter
      });
    }

    setRateLimitHeaders(res, maxRequests, maxRequests - record.count, windowMs);
    next();
  };
}

function setRateLimitHeaders(res, limit, remaining, windowMs) {
  res.set('X-RateLimit-Limit', String(limit));
  res.set('X-RateLimit-Remaining', String(Math.max(0, remaining)));
  res.set('X-RateLimit-Reset', String(Math.ceil((Date.now() + windowMs) / 1000)));
}

/**
 * 認証レート制限（ログイン・登録用、より厳しい制限）
 */
export const authRateLimit = rateLimit({
  maxRequests: RATE_LIMIT.AUTH_MAX_REQUESTS,
  windowMs: RATE_LIMIT.WINDOW_MS,
  keyPrefix: 'auth'
});

/**
 * 一般APIレート制限
 */
export const apiRateLimit = rateLimit({
  maxRequests: RATE_LIMIT.MAX_REQUESTS,
  windowMs: RATE_LIMIT.WINDOW_MS,
  keyPrefix: 'api'
});

/**
 * 認証ミドルウェア - Bearerトークンを検証
 * @param {Function} getSession - セッション取得関数
 */
export function authenticate(getSession) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '認証が必要です'
      });
    }

    const token = authHeader.slice(7);

    if (!token || token.length < 32) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '無効なトークンです'
      });
    }

    try {
      const session = await getSession(token);

      if (!session) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'セッションが無効または期限切れです'
        });
      }

      // リクエストにユーザー情報を付加
      req.user = {
        id: session.user_id,
        token
      };

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: '認証処理中にエラーが発生しました'
      });
    }
  };
}

/**
 * エラーハンドリングミドルウェア
 */
export function errorHandler(err, req, res, _next) {
  console.error('Unhandled error:', err);

  // バリデーションエラー
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.details || []
    });
  }

  // 認証エラー
  if (err.name === 'AuthenticationError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: err.message
    });
  }

  // 権限エラー
  if (err.name === 'ForbiddenError') {
    return res.status(403).json({
      error: 'Forbidden',
      message: err.message
    });
  }

  // 見つからない
  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      error: 'Not Found',
      message: err.message
    });
  }

  // その他のエラー（詳細は隠す）
  res.status(500).json({
    error: 'Internal Server Error',
    message: '予期しないエラーが発生しました'
  });
}

/**
 * 404ハンドラー
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `${req.method} ${req.path} は存在しません`
  });
}

/**
 * リクエストロギングミドルウェア
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    console[logLevel](`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });

  next();
}

/**
 * セキュリティヘッダーミドルウェア
 */
export function securityHeaders(req, res, next) {
  // XSS対策
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');

  // CSP（Content Security Policy）
  res.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "font-src 'self'"
  ].join('; '));

  // HSTS（HTTPS環境のみ）
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

/**
 * カスタムエラークラス
 */
export class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class AuthenticationError extends Error {
  constructor(message = '認証が必要です') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'アクセス権限がありません') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message = 'リソースが見つかりません') {
    super(message);
    this.name = 'NotFoundError';
  }
}
