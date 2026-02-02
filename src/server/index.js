/**
 * メインサーバーエントリーポイント
 *
 * Express.js サーバー with:
 * - セキュリティヘッダー
 * - レート制限
 * - リクエストログ
 * - エラーハンドリング
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './routes.js';
import {
  errorHandler,
  notFoundHandler,
  requestLogger,
  securityHeaders
} from './middleware.js';
import { checkConnection, sessions } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// ミドルウェア
// ============================================

// セキュリティヘッダー
app.use(securityHeaders);

// リクエストログ
app.use(requestLogger);

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// JSON パース
app.use(express.json({ limit: '10mb' }));

// 静的ファイル配信
app.use(express.static(rootDir));

// ============================================
// APIルート
// ============================================

app.use('/api', apiRouter);

// ============================================
// ヘルスチェック
// ============================================

app.get('/health', async (req, res) => {
  const dbConnected = await checkConnection();
  const status = dbConnected ? 'healthy' : 'degraded';

  res.status(dbConnected ? 200 : 503).json({
    status,
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// SPA フォールバック
// ============================================

app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(rootDir, 'login.html'));
});

// ============================================
// エラーハンドリング
// ============================================

// 404 ハンドラー（APIルート）
app.use('/api/*', notFoundHandler);

// グローバルエラーハンドラー
app.use(errorHandler);

// ============================================
// サーバー起動
// ============================================

async function start() {
  // 期限切れセッションのクリーンアップ（起動時）
  try {
    await sessions.cleanupExpired();
    console.log('Expired sessions cleaned up');
  } catch (error) {
    console.warn('Failed to cleanup expired sessions:', error.message);
  }

  // 定期的なクリーンアップ（1時間ごと）
  setInterval(async () => {
    try {
      await sessions.cleanupExpired();
    } catch (error) {
      console.warn('Session cleanup failed:', error.message);
    }
  }, 60 * 60 * 1000);

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

start().catch(console.error);

export default app;
