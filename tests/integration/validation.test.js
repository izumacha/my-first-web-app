/**
 * バリデーション統合テスト
 */

import {
  validatePassword,
  validateUsername,
  validateEmail,
  validateExpense,
  validateIncome,
  validateBudget,
  validateSubscription,
  validateGoal,
  isValidId
} from '../../src/shared/validation.js';

describe('パスワードバリデーション', () => {
  test('有効なパスワードを受け入れる', () => {
    const result = validatePassword('SecurePass123!');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('短すぎるパスワードを拒否する', () => {
    const result = validatePassword('Short1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('パスワードは12文字以上必要です');
  });

  test('大文字がないパスワードを拒否する', () => {
    const result = validatePassword('lowercase123!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('大文字を1文字以上含めてください');
  });

  test('小文字がないパスワードを拒否する', () => {
    const result = validatePassword('UPPERCASE123!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('小文字を1文字以上含めてください');
  });

  test('数字がないパスワードを拒否する', () => {
    const result = validatePassword('NoNumbersHere!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('数字を1文字以上含めてください');
  });

  test('特殊文字がないパスワードを拒否する', () => {
    const result = validatePassword('NoSpecialChar123');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('特殊文字を1文字以上含めてください');
  });

  test('nullパスワードを拒否する', () => {
    const result = validatePassword(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('パスワードは必須です');
  });

  test('空文字パスワードを拒否する', () => {
    const result = validatePassword('');
    expect(result.valid).toBe(false);
  });
});

describe('ユーザー名バリデーション', () => {
  test('有効なユーザー名を受け入れる', () => {
    const result = validateUsername('valid_user-123');
    expect(result.valid).toBe(true);
  });

  test('短すぎるユーザー名を拒否する', () => {
    const result = validateUsername('ab');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('ユーザー名は3文字以上必要です');
  });

  test('長すぎるユーザー名を拒否する', () => {
    const result = validateUsername('a'.repeat(51));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('ユーザー名は50文字以下にしてください');
  });

  test('無効な文字を含むユーザー名を拒否する', () => {
    const result = validateUsername('user@name');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('ユーザー名は英数字、アンダースコア、ハイフンのみ使用できます');
  });

  test('日本語ユーザー名を拒否する', () => {
    const result = validateUsername('ユーザー名');
    expect(result.valid).toBe(false);
  });

  test('nullユーザー名を拒否する', () => {
    const result = validateUsername(null);
    expect(result.valid).toBe(false);
  });
});

describe('メールバリデーション', () => {
  test('有効なメールを受け入れる', () => {
    const result = validateEmail('user@example.com');
    expect(result.valid).toBe(true);
  });

  test('空のメールを受け入れる（オプショナル）', () => {
    const result = validateEmail('');
    expect(result.valid).toBe(true);
  });

  test('nullメールを受け入れる（オプショナル）', () => {
    const result = validateEmail(null);
    expect(result.valid).toBe(true);
  });

  test('無効なメール形式を拒否する', () => {
    const result = validateEmail('invalid-email');
    expect(result.valid).toBe(false);
  });

  test('@がないメールを拒否する', () => {
    const result = validateEmail('userexample.com');
    expect(result.valid).toBe(false);
  });
});

describe('支出バリデーション', () => {
  test('有効な支出を受け入れる', () => {
    const result = validateExpense({
      date: '2025-01-15',
      description: 'テスト支出',
      amount: 1000,
      category: '食費'
    });
    expect(result.valid).toBe(true);
  });

  test('無効な日付形式を拒否する', () => {
    const result = validateExpense({
      date: '2025/01/15',
      description: 'テスト',
      amount: 1000,
      category: '食費'
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('日付はYYYY-MM-DD形式で入力してください');
  });

  test('負の金額を拒否する', () => {
    const result = validateExpense({
      date: '2025-01-15',
      description: 'テスト',
      amount: -100,
      category: '食費'
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('金額は0以上で入力してください');
  });

  test('大きすぎる金額を拒否する', () => {
    const result = validateExpense({
      date: '2025-01-15',
      description: 'テスト',
      amount: 200000000,
      category: '食費'
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('金額が大きすぎます');
  });

  test('小数の金額を拒否する', () => {
    const result = validateExpense({
      date: '2025-01-15',
      description: 'テスト',
      amount: 100.5,
      category: '食費'
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('金額は整数で入力してください');
  });

  test('空の説明を拒否する', () => {
    const result = validateExpense({
      date: '2025-01-15',
      description: '   ',
      amount: 1000,
      category: '食費'
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('説明を入力してください');
  });

  test('長すぎる説明を拒否する', () => {
    const result = validateExpense({
      date: '2025-01-15',
      description: 'あ'.repeat(201),
      amount: 1000,
      category: '食費'
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('説明は200文字以下にしてください');
  });

  test('無効なカテゴリを拒否する', () => {
    const result = validateExpense({
      date: '2025-01-15',
      description: 'テスト',
      amount: 1000,
      category: '存在しないカテゴリ'
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('有効なカテゴリを選択してください');
  });

  test('nullオブジェクトを拒否する', () => {
    const result = validateExpense(null);
    expect(result.valid).toBe(false);
  });
});

describe('収入バリデーション', () => {
  test('有効な収入を受け入れる', () => {
    const result = validateIncome({
      date: '2025-01-15',
      description: '給料',
      amount: 300000
    });
    expect(result.valid).toBe(true);
  });

  test('0円の収入を拒否する', () => {
    const result = validateIncome({
      date: '2025-01-15',
      description: '給料',
      amount: 0
    });
    expect(result.valid).toBe(false);
  });
});

describe('予算バリデーション', () => {
  test('有効な予算を受け入れる', () => {
    const result = validateBudget({
      month: '2025-01',
      category: '食費',
      amount: 50000
    });
    expect(result.valid).toBe(true);
  });

  test('無効な月形式を拒否する', () => {
    const result = validateBudget({
      month: '2025-1',
      category: '食費',
      amount: 50000
    });
    expect(result.valid).toBe(false);
  });

  test('0円の予算を受け入れる', () => {
    const result = validateBudget({
      month: '2025-01',
      category: '食費',
      amount: 0
    });
    expect(result.valid).toBe(true);
  });
});

describe('サブスクリプションバリデーション', () => {
  test('有効なサブスクリプションを受け入れる', () => {
    const result = validateSubscription({
      name: 'Netflix',
      amount: 1980,
      category: '娯楽費',
      cycle: 'monthly',
      pay_day: 15
    });
    expect(result.valid).toBe(true);
  });

  test('無効なサイクルを拒否する', () => {
    const result = validateSubscription({
      name: 'サービス',
      amount: 1000,
      category: '娯楽費',
      cycle: 'daily'
    });
    expect(result.valid).toBe(false);
  });

  test('無効な支払日を拒否する', () => {
    const result = validateSubscription({
      name: 'サービス',
      amount: 1000,
      category: '娯楽費',
      cycle: 'monthly',
      pay_day: 32
    });
    expect(result.valid).toBe(false);
  });
});

describe('目標バリデーション', () => {
  test('有効な目標を受け入れる', () => {
    const result = validateGoal({
      name: '旅行資金',
      target: 100000,
      deadline: '2025-12-31'
    });
    expect(result.valid).toBe(true);
  });

  test('期限なしの目標を受け入れる', () => {
    const result = validateGoal({
      name: '貯金',
      target: 1000000
    });
    expect(result.valid).toBe(true);
  });

  test('無効な期限形式を拒否する', () => {
    const result = validateGoal({
      name: '目標',
      target: 100000,
      deadline: '2025/12/31'
    });
    expect(result.valid).toBe(false);
  });
});

describe('ID バリデーション', () => {
  test('正の整数を受け入れる', () => {
    expect(isValidId(123)).toBe(true);
  });

  test('整数文字列を受け入れる', () => {
    expect(isValidId('456')).toBe(true);
  });

  test('UUID v4を受け入れる', () => {
    expect(isValidId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  test('0を拒否する', () => {
    expect(isValidId(0)).toBe(false);
  });

  test('負の数を拒否する', () => {
    expect(isValidId(-1)).toBe(false);
  });

  test('小数を拒否する', () => {
    expect(isValidId(1.5)).toBe(false);
  });

  test('無効な文字列を拒否する', () => {
    expect(isValidId('invalid')).toBe(false);
  });

  test('nullを拒否する', () => {
    expect(isValidId(null)).toBe(false);
  });
});
