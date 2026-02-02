/**
 * 共有定数 - バックエンド・フロントエンド両方で使用
 */

export const CATEGORIES = Object.freeze([
  '食費',
  '交通費',
  '住居費',
  '光熱費',
  '通信費',
  '日用品',
  '衣服費',
  '医療費',
  '教育費',
  '娯楽費',
  'その他'
]);

export const CATEGORY_COLORS = Object.freeze({
  '食費': '#FF6384',
  '交通費': '#36A2EB',
  '住居費': '#FFCE56',
  '光熱費': '#4BC0C0',
  '通信費': '#9966FF',
  '日用品': '#FF9F40',
  '衣服費': '#C9CBCF',
  '医療費': '#7BC8A4',
  '教育費': '#E7E9ED',
  '娯楽費': '#8B5CF6',
  'その他': '#6B7280'
});

export const SUBSCRIPTION_CYCLES = Object.freeze({
  MONTHLY: 'monthly',
  WEEKLY: 'weekly',
  ANNUAL: 'annual'
});

export const ACCOUNT_TYPES = Object.freeze({
  BANK: 'bank',
  CREDIT: 'credit',
  EMONEY: 'emoney',
  SECURITIES: 'securities',
  POINTS: 'points'
});

export const PASSWORD_REQUIREMENTS = Object.freeze({
  MIN_LENGTH: 12,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true
});

export const SESSION_CONFIG = Object.freeze({
  EXPIRY_DAYS: 30,
  TOKEN_BYTES: 32
});

export const RATE_LIMIT = Object.freeze({
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
  AUTH_MAX_REQUESTS: 5 // Login/register attempts
});

export const PAGINATION = Object.freeze({
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 200
});
