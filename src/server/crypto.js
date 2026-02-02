/**
 * 暗号化ユーティリティ - AES-256-GCM による安全な暗号化
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * 環境変数から暗号化キーを取得または生成
 * @returns {Buffer}
 */
function getEncryptionKey() {
  const masterKey = process.env.ENCRYPTION_KEY;
  if (!masterKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  // マスターキーからAESキーを導出
  return crypto.pbkdf2Sync(masterKey, 'household-budget-salt', ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * 文字列を暗号化
 * @param {string} plaintext - 暗号化する文字列
 * @returns {string} - Base64エンコードされた暗号文（IV + AuthTag + Ciphertext）
 */
export function encrypt(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a non-empty string');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // IV (16) + AuthTag (16) + Ciphertext をBase64で返す
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'base64')
  ]);

  return combined.toString('base64');
}

/**
 * 暗号文を復号
 * @param {string} ciphertext - Base64エンコードされた暗号文
 * @returns {string} - 復号された平文
 */
export function decrypt(ciphertext) {
  if (!ciphertext || typeof ciphertext !== 'string') {
    throw new Error('Ciphertext must be a non-empty string');
  }

  const key = getEncryptionKey();
  const combined = Buffer.from(ciphertext, 'base64');

  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Invalid ciphertext format');
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * パスワードをハッシュ化（bcrypt互換だがより安全なargon2風のPBKDF2）
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LENGTH);
    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      // salt:hash 形式で返す
      resolve(`${salt.toString('base64')}:${derivedKey.toString('base64')}`);
    });
  });
}

/**
 * パスワードを検証
 * @param {string} password
 * @param {string} storedHash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, storedHash) {
  return new Promise((resolve, reject) => {
    const [saltBase64, hashBase64] = storedHash.split(':');
    if (!saltBase64 || !hashBase64) {
      resolve(false);
      return;
    }

    const salt = Buffer.from(saltBase64, 'base64');
    const storedDerivedKey = Buffer.from(hashBase64, 'base64');

    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      // タイミング攻撃を防ぐため、定数時間比較
      resolve(crypto.timingSafeEqual(derivedKey, storedDerivedKey));
    });
  });
}

/**
 * セキュアなランダムトークンを生成
 * @param {number} bytes
 * @returns {string}
 */
export function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * UUIDv4を生成
 * @returns {string}
 */
export function generateUUID() {
  return crypto.randomUUID();
}
