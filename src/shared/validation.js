/**
 * バリデーション - 入力検証のユーティリティ
 */

import { CATEGORIES, PASSWORD_REQUIREMENTS, SUBSCRIPTION_CYCLES } from './constants.js';

/**
 * バリデーション結果
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string[]} errors
 */

/**
 * パスワード強度を検証
 * @param {string} password
 * @returns {ValidationResult}
 */
export function validatePassword(password) {
  const errors = [];
  const { MIN_LENGTH, REQUIRE_UPPERCASE, REQUIRE_LOWERCASE, REQUIRE_NUMBER, REQUIRE_SPECIAL } = PASSWORD_REQUIREMENTS;

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['パスワードは必須です'] };
  }

  if (password.length < MIN_LENGTH) {
    errors.push(`パスワードは${MIN_LENGTH}文字以上必要です`);
  }

  if (REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('大文字を1文字以上含めてください');
  }

  if (REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('小文字を1文字以上含めてください');
  }

  if (REQUIRE_NUMBER && !/\d/.test(password)) {
    errors.push('数字を1文字以上含めてください');
  }

  if (REQUIRE_SPECIAL && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('特殊文字を1文字以上含めてください');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * ユーザー名を検証
 * @param {string} username
 * @returns {ValidationResult}
 */
export function validateUsername(username) {
  const errors = [];

  if (!username || typeof username !== 'string') {
    return { valid: false, errors: ['ユーザー名は必須です'] };
  }

  const trimmed = username.trim();

  if (trimmed.length < 3) {
    errors.push('ユーザー名は3文字以上必要です');
  }

  if (trimmed.length > 50) {
    errors.push('ユーザー名は50文字以下にしてください');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    errors.push('ユーザー名は英数字、アンダースコア、ハイフンのみ使用できます');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * メールアドレスを検証
 * @param {string} email
 * @returns {ValidationResult}
 */
export function validateEmail(email) {
  if (!email) {
    return { valid: true, errors: [] }; // オプショナル
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, errors: ['有効なメールアドレスを入力してください'] };
  }

  return { valid: true, errors: [] };
}

/**
 * 支出データを検証
 * @param {Object} expense
 * @returns {ValidationResult}
 */
export function validateExpense(expense) {
  const errors = [];

  if (!expense || typeof expense !== 'object') {
    return { valid: false, errors: ['支出データが不正です'] };
  }

  // 日付
  if (!expense.date || !/^\d{4}-\d{2}-\d{2}$/.test(expense.date)) {
    errors.push('日付はYYYY-MM-DD形式で入力してください');
  } else {
    const date = new Date(expense.date);
    if (isNaN(date.getTime())) {
      errors.push('無効な日付です');
    }
  }

  // 金額
  if (typeof expense.amount !== 'number' || !Number.isInteger(expense.amount)) {
    errors.push('金額は整数で入力してください');
  } else if (expense.amount < 0) {
    errors.push('金額は0以上で入力してください');
  } else if (expense.amount > 100000000) {
    errors.push('金額が大きすぎます');
  }

  // 説明
  if (!expense.description || typeof expense.description !== 'string') {
    errors.push('説明は必須です');
  } else if (expense.description.trim().length === 0) {
    errors.push('説明を入力してください');
  } else if (expense.description.length > 200) {
    errors.push('説明は200文字以下にしてください');
  }

  // カテゴリ
  if (!expense.category || !CATEGORIES.includes(expense.category)) {
    errors.push('有効なカテゴリを選択してください');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 収入データを検証
 * @param {Object} income
 * @returns {ValidationResult}
 */
export function validateIncome(income) {
  const errors = [];

  if (!income || typeof income !== 'object') {
    return { valid: false, errors: ['収入データが不正です'] };
  }

  if (!income.date || !/^\d{4}-\d{2}-\d{2}$/.test(income.date)) {
    errors.push('日付はYYYY-MM-DD形式で入力してください');
  }

  if (typeof income.amount !== 'number' || !Number.isInteger(income.amount)) {
    errors.push('金額は整数で入力してください');
  } else if (income.amount <= 0) {
    errors.push('金額は1以上で入力してください');
  }

  if (!income.description || income.description.trim().length === 0) {
    errors.push('説明を入力してください');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 予算データを検証
 * @param {Object} budget
 * @returns {ValidationResult}
 */
export function validateBudget(budget) {
  const errors = [];

  if (!budget || typeof budget !== 'object') {
    return { valid: false, errors: ['予算データが不正です'] };
  }

  if (!budget.month || !/^\d{4}-\d{2}$/.test(budget.month)) {
    errors.push('月はYYYY-MM形式で入力してください');
  }

  if (!budget.category || !CATEGORIES.includes(budget.category)) {
    errors.push('有効なカテゴリを選択してください');
  }

  if (typeof budget.amount !== 'number' || !Number.isInteger(budget.amount)) {
    errors.push('金額は整数で入力してください');
  } else if (budget.amount < 0) {
    errors.push('金額は0以上で入力してください');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * サブスクリプションデータを検証
 * @param {Object} subscription
 * @returns {ValidationResult}
 */
export function validateSubscription(subscription) {
  const errors = [];

  if (!subscription || typeof subscription !== 'object') {
    return { valid: false, errors: ['サブスクリプションデータが不正です'] };
  }

  if (!subscription.name || subscription.name.trim().length === 0) {
    errors.push('名前を入力してください');
  }

  if (typeof subscription.amount !== 'number' || subscription.amount <= 0) {
    errors.push('金額は1以上で入力してください');
  }

  if (!subscription.category || !CATEGORIES.includes(subscription.category)) {
    errors.push('有効なカテゴリを選択してください');
  }

  const validCycles = Object.values(SUBSCRIPTION_CYCLES);
  if (!subscription.cycle || !validCycles.includes(subscription.cycle)) {
    errors.push('有効な支払いサイクルを選択してください');
  }

  if (subscription.pay_day !== undefined) {
    if (!Number.isInteger(subscription.pay_day) || subscription.pay_day < 1 || subscription.pay_day > 31) {
      errors.push('支払日は1-31の間で入力してください');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 目標データを検証
 * @param {Object} goal
 * @returns {ValidationResult}
 */
export function validateGoal(goal) {
  const errors = [];

  if (!goal || typeof goal !== 'object') {
    return { valid: false, errors: ['目標データが不正です'] };
  }

  if (!goal.name || goal.name.trim().length === 0) {
    errors.push('目標名を入力してください');
  }

  if (typeof goal.target !== 'number' || goal.target <= 0) {
    errors.push('目標金額は1以上で入力してください');
  }

  if (goal.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(goal.deadline)) {
    errors.push('期限はYYYY-MM-DD形式で入力してください');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * IDを検証（整数またはUUID）
 * @param {string|number} id
 * @returns {boolean}
 */
export function isValidId(id) {
  if (typeof id === 'number') {
    return Number.isInteger(id) && id > 0;
  }
  if (typeof id === 'string') {
    // UUID v4 format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    // Integer string
    const intRegex = /^\d+$/;
    return uuidRegex.test(id) || intRegex.test(id);
  }
  return false;
}
