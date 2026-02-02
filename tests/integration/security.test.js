/**
 * セキュリティテスト
 * @jest-environment node
 */

import { jest } from '@jest/globals';

// 環境変数をセット
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-testing-purposes-only';

describe('暗号化モジュール', () => {
  let cryptoModule;

  beforeAll(async () => {
    cryptoModule = await import('../../src/server/crypto.js');
  });

  describe('encrypt / decrypt', () => {
    test('文字列を暗号化・復号できる', () => {
      const plaintext = 'これは秘密のメッセージです';
      const ciphertext = cryptoModule.encrypt(plaintext);

      expect(ciphertext).not.toBe(plaintext);
      expect(ciphertext).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64形式

      const decrypted = cryptoModule.decrypt(ciphertext);
      expect(decrypted).toBe(plaintext);
    });

    test('同じ平文でも毎回異なる暗号文を生成する（IVがランダム）', () => {
      const plaintext = 'テスト文字列';
      const ciphertext1 = cryptoModule.encrypt(plaintext);
      const ciphertext2 = cryptoModule.encrypt(plaintext);

      expect(ciphertext1).not.toBe(ciphertext2);

      // どちらも同じ平文に復号できる
      expect(cryptoModule.decrypt(ciphertext1)).toBe(plaintext);
      expect(cryptoModule.decrypt(ciphertext2)).toBe(plaintext);
    });

    test('空文字列を暗号化しようとするとエラー', () => {
      expect(() => cryptoModule.encrypt('')).toThrow();
    });

    test('nullを暗号化しようとするとエラー', () => {
      expect(() => cryptoModule.encrypt(null)).toThrow();
    });

    test('改ざんされた暗号文は復号に失敗する', () => {
      const plaintext = '重要なデータ';
      const ciphertext = cryptoModule.encrypt(plaintext);

      // 暗号文を改ざん
      const tamperedBuffer = Buffer.from(ciphertext, 'base64');
      tamperedBuffer[tamperedBuffer.length - 1] ^= 0xFF;
      const tampered = tamperedBuffer.toString('base64');

      expect(() => cryptoModule.decrypt(tampered)).toThrow();
    });

    test('短すぎる暗号文は復号に失敗する', () => {
      expect(() => cryptoModule.decrypt('short')).toThrow();
    });
  });

  describe('hashPassword / verifyPassword', () => {
    test('パスワードをハッシュ化・検証できる', async () => {
      const password = 'SecurePassword123!';
      const hash = await cryptoModule.hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash).toContain(':'); // salt:hash 形式

      const isValid = await cryptoModule.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    test('異なるパスワードは検証に失敗する', async () => {
      const password = 'CorrectPassword123!';
      const hash = await cryptoModule.hashPassword(password);

      const isValid = await cryptoModule.verifyPassword('WrongPassword123!', hash);
      expect(isValid).toBe(false);
    });

    test('同じパスワードでも毎回異なるハッシュを生成する（saltがランダム）', async () => {
      const password = 'SamePassword123!';
      const hash1 = await cryptoModule.hashPassword(password);
      const hash2 = await cryptoModule.hashPassword(password);

      expect(hash1).not.toBe(hash2);

      // どちらも検証に成功する
      expect(await cryptoModule.verifyPassword(password, hash1)).toBe(true);
      expect(await cryptoModule.verifyPassword(password, hash2)).toBe(true);
    });

    test('不正な形式のハッシュは検証に失敗する', async () => {
      const isValid = await cryptoModule.verifyPassword('password', 'invalid-hash');
      expect(isValid).toBe(false);
    });
  });

  describe('generateSecureToken', () => {
    test('指定されたバイト数の2倍の長さのhex文字列を生成する', () => {
      const token = cryptoModule.generateSecureToken(32);
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    test('デフォルトは32バイト', () => {
      const token = cryptoModule.generateSecureToken();
      expect(token).toHaveLength(64);
    });

    test('毎回異なるトークンを生成する', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(cryptoModule.generateSecureToken());
      }
      expect(tokens.size).toBe(100);
    });
  });

  describe('generateUUID', () => {
    test('UUID v4形式の文字列を生成する', () => {
      const uuid = cryptoModule.generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    test('毎回異なるUUIDを生成する', () => {
      const uuids = new Set();
      for (let i = 0; i < 100; i++) {
        uuids.add(cryptoModule.generateUUID());
      }
      expect(uuids.size).toBe(100);
    });
  });
});

describe('XSS対策', () => {
  test('HTMLタグをエスケープする', async () => {
    // シンプルなエスケープ関数をテスト
    const escapeHtml = (text) => {
      if (text === null || text === undefined) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const malicious = '<script>alert("XSS")</script>';
    const escaped = escapeHtml(malicious);

    expect(escaped).not.toContain('<script>');
    expect(escaped).toContain('&lt;script&gt;');
  });

  test('イベントハンドラをエスケープする', () => {
    const escapeHtml = (text) => {
      if (text === null || text === undefined) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const malicious = '<img src="x" onerror="alert(1)">';
    const escaped = escapeHtml(malicious);

    // HTMLタグがエスケープされていれば、ブラウザは実行しない
    expect(escaped).not.toContain('<img');
    expect(escaped).toContain('&lt;img');
    // 引用符もエスケープされている
    expect(escaped).toContain('&quot;');
  });
});

describe('入力サニタイゼーション', () => {
  test('SQLインジェクション文字列をバリデーションで拒否する', async () => {
    const { validateUsername } = await import('../../src/shared/validation.js');

    const malicious = "admin'; DROP TABLE users; --";
    const result = validateUsername(malicious);

    expect(result.valid).toBe(false);
  });

  test('パストラバーサル攻撃文字列をバリデーションで拒否する', async () => {
    const { validateUsername } = await import('../../src/shared/validation.js');

    const malicious = '../../../etc/passwd';
    const result = validateUsername(malicious);

    expect(result.valid).toBe(false);
  });

  test('コマンドインジェクション文字列をバリデーションで拒否する', async () => {
    const { validateUsername } = await import('../../src/shared/validation.js');

    const malicious = 'user; rm -rf /';
    const result = validateUsername(malicious);

    expect(result.valid).toBe(false);
  });
});

describe('レート制限', () => {
  let rateLimit;

  beforeAll(async () => {
    const middleware = await import('../../src/server/middleware.js');
    rateLimit = middleware.rateLimit;
  });

  test('制限内のリクエストを許可する', () => {
    const limiter = rateLimit({ maxRequests: 5, windowMs: 60000, keyPrefix: 'test-allow' });

    const req = { ip: '192.168.1.100' };
    const res = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    // 5回リクエスト
    for (let i = 0; i < 5; i++) {
      limiter(req, res, next);
    }

    expect(next).toHaveBeenCalledTimes(5);
  });

  test('制限を超えたリクエストを拒否する', () => {
    const limiter = rateLimit({ maxRequests: 3, windowMs: 60000, keyPrefix: 'test-deny' });

    const req = { ip: '192.168.1.101' };
    const res = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    // 4回リクエスト（3回は成功、4回目は失敗）
    for (let i = 0; i < 4; i++) {
      limiter(req, res, next);
    }

    expect(next).toHaveBeenCalledTimes(3);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Too Many Requests'
      })
    );
  });

  test('異なるIPは個別にカウントされる', () => {
    const limiter = rateLimit({ maxRequests: 2, windowMs: 60000, keyPrefix: 'test-ip' });

    const req1 = { ip: '192.168.1.200' };
    const req2 = { ip: '192.168.1.201' };
    const res = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    // IP1から2回
    limiter(req1, res, next);
    limiter(req1, res, next);

    // IP2から2回
    limiter(req2, res, next);
    limiter(req2, res, next);

    expect(next).toHaveBeenCalledTimes(4);
  });
});

describe('認証エラー', () => {
  test('認証ミドルウェアがトークンなしを拒否する', async () => {
    const { authenticate } = await import('../../src/server/middleware.js');

    const mockGetSession = jest.fn();
    const authMiddleware = authenticate(mockGetSession);

    const req = { headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('認証ミドルウェアが無効なトークンを拒否する', async () => {
    const { authenticate } = await import('../../src/server/middleware.js');

    const mockGetSession = jest.fn().mockResolvedValue(null);
    const authMiddleware = authenticate(mockGetSession);

    const req = { headers: { authorization: 'Bearer invalid-token-that-is-long-enough' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('認証ミドルウェアが有効なセッションを許可する', async () => {
    const { authenticate } = await import('../../src/server/middleware.js');

    const mockSession = { user_id: 'user-123' };
    const mockGetSession = jest.fn().mockResolvedValue(mockSession);
    const authMiddleware = authenticate(mockGetSession);

    const req = { headers: { authorization: 'Bearer valid-token-that-is-long-enough-32chars' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      id: 'user-123',
      token: 'valid-token-that-is-long-enough-32chars'
    });
  });
});

describe('セキュリティヘッダー', () => {
  test('セキュリティヘッダーが設定される', async () => {
    const { securityHeaders } = await import('../../src/server/middleware.js');

    const req = { secure: false, headers: {} };
    const headers = {};
    const res = {
      set: jest.fn((key, value) => { headers[key] = value; })
    };
    const next = jest.fn();

    securityHeaders(req, res, next);

    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-XSS-Protection']).toBe('1; mode=block');
    expect(headers['Content-Security-Policy']).toBeDefined();
    expect(next).toHaveBeenCalled();
  });

  test('HTTPS環境でHSTSヘッダーが設定される', async () => {
    const { securityHeaders } = await import('../../src/server/middleware.js');

    const req = { secure: true, headers: {} };
    const headers = {};
    const res = {
      set: jest.fn((key, value) => { headers[key] = value; })
    };
    const next = jest.fn();

    securityHeaders(req, res, next);

    expect(headers['Strict-Transport-Security']).toContain('max-age=');
  });
});
