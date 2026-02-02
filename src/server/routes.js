/**
 * APIルーター - 全エンドポイントの定義
 */

import { Router } from 'express';
import * as db from './database.js';
import { authenticate, authRateLimit, apiRateLimit, ValidationError } from './middleware.js';
import {
  validateUsername,
  validatePassword,
  validateEmail,
  validateExpense,
  validateIncome,
  validateBudget,
  validateSubscription,
  validateGoal,
  isValidId
} from '../shared/validation.js';

const router = Router();

// ============================================
// 認証エンドポイント
// ============================================

const authRouter = Router();

/**
 * ユーザー登録
 */
authRouter.post('/register', authRateLimit, async (req, res, next) => {
  try {
    const { username, password, email, displayName } = req.body;

    // バリデーション
    const usernameResult = validateUsername(username);
    if (!usernameResult.valid) {
      throw new ValidationError('ユーザー名が不正です', usernameResult.errors);
    }

    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      throw new ValidationError('パスワードが不正です', passwordResult.errors);
    }

    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      throw new ValidationError('メールアドレスが不正です', emailResult.errors);
    }

    // ユーザー作成
    const user = await db.users.create(username, password, email, displayName);

    // セッション作成
    const token = await db.sessions.create(user.id);

    res.status(201).json({
      message: '登録が完了しました',
      user: { id: user.id, username: user.username },
      token
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ログイン
 */
authRouter.post('/login', authRateLimit, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new ValidationError('ユーザー名とパスワードは必須です');
    }

    const user = await db.users.verifyCredentials(username, password);
    if (!user) {
      // セキュリティ: 具体的な失敗理由は伝えない
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'ユーザー名またはパスワードが正しくありません'
      });
    }

    const token = await db.sessions.create(user.id);

    res.json({
      message: 'ログインしました',
      user: { id: user.id, username: user.username },
      token
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ログアウト
 */
authRouter.post('/logout', authenticate(db.sessions.get.bind(db.sessions)), async (req, res, next) => {
  try {
    await db.sessions.delete(req.user.token);
    res.json({ message: 'ログアウトしました' });
  } catch (error) {
    next(error);
  }
});

/**
 * 現在のユーザー情報取得
 */
authRouter.get('/me', authenticate(db.sessions.get.bind(db.sessions)), async (req, res, next) => {
  try {
    const user = await db.users.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'ユーザーが見つかりません' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * パスワード変更
 */
authRouter.put('/password', authenticate(db.sessions.get.bind(db.sessions)), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ValidationError('現在のパスワードと新しいパスワードは必須です');
    }

    const passwordResult = validatePassword(newPassword);
    if (!passwordResult.valid) {
      throw new ValidationError('新しいパスワードが不正です', passwordResult.errors);
    }

    await db.users.updatePassword(req.user.id, currentPassword, newPassword);

    // 全セッション無効化（セキュリティ）
    await db.sessions.deleteAllForUser(req.user.id);

    res.json({ message: 'パスワードを変更しました。再度ログインしてください。' });
  } catch (error) {
    next(error);
  }
});

/**
 * プロフィール更新
 */
authRouter.put('/profile', authenticate(db.sessions.get.bind(db.sessions)), async (req, res, next) => {
  try {
    const { displayName, email } = req.body;

    if (email) {
      const emailResult = validateEmail(email);
      if (!emailResult.valid) {
        throw new ValidationError('メールアドレスが不正です', emailResult.errors);
      }
    }

    await db.users.updateProfile(req.user.id, { display_name: displayName, email });
    res.json({ message: 'プロフィールを更新しました' });
  } catch (error) {
    next(error);
  }
});

/**
 * アカウント削除
 */
authRouter.delete('/account', authenticate(db.sessions.get.bind(db.sessions)), async (req, res, next) => {
  try {
    await db.users.delete(req.user.id);
    res.json({ message: 'アカウントを削除しました' });
  } catch (error) {
    next(error);
  }
});

router.use('/auth', authRouter);

// ============================================
// 認証必須ミドルウェアを適用
// ============================================

const protectedRouter = Router();
protectedRouter.use(authenticate(db.sessions.get.bind(db.sessions)));
protectedRouter.use(apiRateLimit);

// ============================================
// 汎用CRUDルートファクトリ
// ============================================

function createCrudRoutes(repository, validateFn, options = {}) {
  const crudRouter = Router();
  const { allowBulkCreate = true, allowBulkDelete = true } = options;

  // 全件取得
  crudRouter.get('/', async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || undefined;
      const offset = parseInt(req.query.offset) || 0;
      const result = await repository.findAll(req.user.id, { limit, offset });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // 1件作成
  crudRouter.post('/', async (req, res, next) => {
    try {
      const result = validateFn(req.body);
      if (!result.valid) {
        throw new ValidationError('入力データが不正です', result.errors);
      }

      const data = await repository.create(req.user.id, req.body);
      res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  });

  // 1件更新
  crudRouter.put('/:id', async (req, res, next) => {
    try {
      if (!isValidId(req.params.id)) {
        throw new ValidationError('IDが不正です');
      }

      const result = validateFn(req.body);
      if (!result.valid) {
        throw new ValidationError('入力データが不正です', result.errors);
      }

      const data = await repository.update(req.user.id, req.params.id, req.body);
      if (!data) {
        return res.status(404).json({ error: 'Not Found', message: 'データが見つかりません' });
      }
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // 1件削除
  crudRouter.delete('/:id', async (req, res, next) => {
    try {
      if (!isValidId(req.params.id)) {
        throw new ValidationError('IDが不正です');
      }

      await repository.delete(req.user.id, req.params.id);
      res.json({ message: '削除しました' });
    } catch (error) {
      next(error);
    }
  });

  // 一括作成
  if (allowBulkCreate) {
    crudRouter.post('/bulk', async (req, res, next) => {
      try {
        const records = req.body;
        if (!Array.isArray(records)) {
          throw new ValidationError('配列を送信してください');
        }

        // 全レコードをバリデーション
        for (let i = 0; i < records.length; i++) {
          const result = validateFn(records[i]);
          if (!result.valid) {
            throw new ValidationError(`${i + 1}番目のデータが不正です`, result.errors);
          }
        }

        const data = await repository.bulkCreate(req.user.id, records);
        res.status(201).json(data);
      } catch (error) {
        next(error);
      }
    });
  }

  // 全件削除
  if (allowBulkDelete) {
    crudRouter.delete('/', async (req, res, next) => {
      try {
        await repository.deleteAll(req.user.id);
        res.json({ message: '全て削除しました' });
      } catch (error) {
        next(error);
      }
    });
  }

  return crudRouter;
}

// ============================================
// エンティティ別ルート
// ============================================

// 支出
protectedRouter.use('/expenses', createCrudRoutes(db.expenses, validateExpense));

// 収入
protectedRouter.use('/incomes', createCrudRoutes(db.incomes, validateIncome));

// サブスクリプション
protectedRouter.use('/subscriptions', createCrudRoutes(db.subscriptions, validateSubscription));

// 目標
protectedRouter.use('/goals', createCrudRoutes(db.goals, validateGoal));

// 家族メンバー
protectedRouter.use('/family', createCrudRoutes(
  db.familyMembers,
  (data) => {
    if (!data.name || data.name.trim().length === 0) {
      return { valid: false, errors: ['名前を入力してください'] };
    }
    return { valid: true, errors: [] };
  }
));

// クイック入力
protectedRouter.use('/quick-inputs', createCrudRoutes(
  db.quickInputs,
  validateExpense // 支出と同じバリデーション
));

// ============================================
// 特殊エンドポイント
// ============================================

// 予算
protectedRouter.get('/budgets', async (req, res, next) => {
  try {
    const data = await db.budgets.findAll(req.user.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

protectedRouter.put('/budgets', async (req, res, next) => {
  try {
    const budgetData = req.body;

    // バリデーション
    for (const [month, categories] of Object.entries(budgetData)) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        throw new ValidationError(`月の形式が不正です: ${month}`);
      }
      for (const [category, amount] of Object.entries(categories)) {
        const result = validateBudget({ month, category, amount });
        if (!result.valid) {
          throw new ValidationError(`予算データが不正です (${month} - ${category})`, result.errors);
        }
      }
    }

    await db.budgets.bulkUpsert(req.user.id, budgetData);
    res.json({ message: '予算を保存しました' });
  } catch (error) {
    next(error);
  }
});

// ゲーミフィケーション
protectedRouter.get('/gamification', async (req, res, next) => {
  try {
    const data = await db.gamification.get(req.user.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

protectedRouter.put('/gamification', async (req, res, next) => {
  try {
    await db.gamification.upsert(req.user.id, req.body);
    res.json({ message: '保存しました' });
  } catch (error) {
    next(error);
  }
});

// 連携口座
protectedRouter.get('/linked-accounts', async (req, res, next) => {
  try {
    const data = await db.linkedAccounts.get(req.user.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

protectedRouter.put('/linked-accounts', async (req, res, next) => {
  try {
    await db.linkedAccounts.upsert(req.user.id, req.body);
    res.json({ message: '保存しました' });
  } catch (error) {
    next(error);
  }
});

// 接続アカウント
protectedRouter.get('/connected-accounts', async (req, res, next) => {
  try {
    const data = await db.connectedAccounts.get(req.user.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

protectedRouter.put('/connected-accounts/:serviceId', async (req, res, next) => {
  try {
    await db.connectedAccounts.upsert(req.user.id, req.params.serviceId, req.body);
    res.json({ message: '保存しました' });
  } catch (error) {
    next(error);
  }
});

// 同期ログ
protectedRouter.get('/sync-logs', async (req, res, next) => {
  try {
    const data = await db.syncLogs.get(req.user.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

protectedRouter.post('/sync-logs', async (req, res, next) => {
  try {
    await db.syncLogs.add(req.user.id, req.body);
    res.status(201).json({ message: 'ログを追加しました' });
  } catch (error) {
    next(error);
  }
});

// 全データエクスポート
protectedRouter.get('/all-data', async (req, res, next) => {
  try {
    const data = await db.allData.export(req.user.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// 全データ削除
protectedRouter.delete('/all-data', async (req, res, next) => {
  try {
    await db.allData.deleteAll(req.user.id);
    res.json({ message: '全データを削除しました' });
  } catch (error) {
    next(error);
  }
});

router.use('/', protectedRouter);

export default router;
