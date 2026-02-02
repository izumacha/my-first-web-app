/**
 * データベースアクセス層 - Supabase PostgreSQL
 *
 * 設計原則:
 * - 全ての入力はバリデーション済みであることを前提
 * - ユーザーIDは認証ミドルウェアで検証済み
 * - エラーは呼び出し元で適切にハンドリング
 */

import { createClient } from '@supabase/supabase-js';
import { hashPassword, verifyPassword, generateSecureToken, generateUUID, encrypt, decrypt } from './crypto.js';
import { SESSION_CONFIG, PAGINATION } from '../shared/constants.js';

// Supabase クライアント初期化
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Warning: Supabase credentials not configured');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * データベース接続確認
 */
export async function checkConnection() {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

// ============================================
// ユーザー管理
// ============================================

export const users = {
  /**
   * ユーザー作成
   * @param {string} username
   * @param {string} password - 平文パスワード（ハッシュ化される）
   * @param {string} [email]
   * @param {string} [displayName]
   * @returns {Promise<{id: string, username: string}>}
   */
  async create(username, password, email = null, displayName = null) {
    const id = generateUUID();
    const passwordHash = await hashPassword(password);

    const { error } = await supabase
      .from('users')
      .insert({
        id,
        username: username.toLowerCase().trim(),
        password_hash: passwordHash,
        email: email?.toLowerCase().trim() || null,
        display_name: displayName?.trim() || null
      });

    if (error) {
      if (error.code === '23505') {
        throw new Error('このユーザー名は既に使用されています');
      }
      throw error;
    }

    return { id, username };
  },

  /**
   * ユーザー名でユーザーを検索
   */
  async findByUsername(username) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, password_hash, email, display_name')
      .eq('username', username.toLowerCase().trim())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * IDでユーザーを検索
   */
  async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, display_name, created_at')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * パスワード検証
   */
  async verifyCredentials(username, password) {
    const user = await this.findByUsername(username);
    if (!user) return null;

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) return null;

    return { id: user.id, username: user.username };
  },

  /**
   * パスワード更新
   */
  async updatePassword(userId, currentPassword, newPassword) {
    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (!user) throw new Error('ユーザーが見つかりません');

    const isValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isValid) throw new Error('現在のパスワードが正しくありません');

    const newHash = await hashPassword(newPassword);
    const { error } = await supabase
      .from('users')
      .update({ password_hash: newHash, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
  },

  /**
   * プロフィール更新
   */
  async updateProfile(userId, updates) {
    const allowedFields = ['display_name', 'email'];
    const safeUpdates = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        safeUpdates[field] = updates[field]?.trim() || null;
      }
    }

    safeUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('users')
      .update(safeUpdates)
      .eq('id', userId);

    if (error) throw error;
  },

  /**
   * ユーザー削除（カスケード削除）
   */
  async delete(userId) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;
  }
};

// ============================================
// セッション管理
// ============================================

export const sessions = {
  /**
   * セッション作成
   */
  async create(userId) {
    const token = generateSecureToken(SESSION_CONFIG.TOKEN_BYTES);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_CONFIG.EXPIRY_DAYS);

    const { error } = await supabase
      .from('sessions')
      .insert({
        token,
        user_id: userId,
        expires_at: expiresAt.toISOString()
      });

    if (error) throw error;
    return token;
  },

  /**
   * セッション取得（有効期限チェック付き）
   */
  async get(token) {
    const { data, error } = await supabase
      .from('sessions')
      .select('user_id, expires_at')
      .eq('token', token)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    // 期限切れチェック
    if (new Date(data.expires_at) < new Date()) {
      await this.delete(token);
      return null;
    }

    return data;
  },

  /**
   * セッション削除
   */
  async delete(token) {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('token', token);

    if (error) throw error;
  },

  /**
   * ユーザーの全セッション削除
   */
  async deleteAllForUser(userId) {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  },

  /**
   * 期限切れセッションのクリーンアップ
   */
  async cleanupExpired() {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
  }
};

// ============================================
// 汎用CRUDファクトリ
// ============================================

/**
 * 標準的なCRUD操作を持つリポジトリを生成
 * @param {string} tableName
 * @param {Object} options
 */
function createRepository(tableName, options = {}) {
  const { orderBy = 'created_at', orderDirection = 'desc' } = options;

  return {
    /**
     * 全件取得（ページネーション対応）
     */
    async findAll(userId, { limit = PAGINATION.DEFAULT_LIMIT, offset = 0 } = {}) {
      const safeLimit = Math.min(limit, PAGINATION.MAX_LIMIT);

      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order(orderBy, { ascending: orderDirection === 'asc' })
        .range(offset, offset + safeLimit - 1);

      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },

    /**
     * 1件取得
     */
    async findById(userId, id) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },

    /**
     * 作成
     */
    async create(userId, record) {
      const { data, error } = await supabase
        .from(tableName)
        .insert({ ...record, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    /**
     * 更新
     */
    async update(userId, id, updates) {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('user_id', userId)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    /**
     * 削除
     */
    async delete(userId, id) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('user_id', userId)
        .eq('id', id);

      if (error) throw error;
    },

    /**
     * 全件削除
     */
    async deleteAll(userId) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },

    /**
     * 一括作成
     */
    async bulkCreate(userId, records) {
      if (!records.length) return [];

      const withUserId = records.map(r => ({ ...r, user_id: userId }));

      const { data, error } = await supabase
        .from(tableName)
        .insert(withUserId)
        .select();

      if (error) throw error;
      return data;
    }
  };
}

// ============================================
// エンティティ別リポジトリ
// ============================================

export const expenses = createRepository('expenses', { orderBy: 'date', orderDirection: 'desc' });
export const incomes = createRepository('incomes', { orderBy: 'date', orderDirection: 'desc' });
export const subscriptions = createRepository('subscriptions');
export const goals = createRepository('goals');
export const familyMembers = createRepository('family_members');
export const quickInputs = createRepository('quick_inputs');

// ============================================
// 特殊なエンティティ
// ============================================

export const budgets = {
  /**
   * 予算取得（月別・カテゴリ別のマップ形式）
   */
  async findAll(userId) {
    const { data, error } = await supabase
      .from('budgets')
      .select('month, category, amount')
      .eq('user_id', userId);

    if (error) throw error;

    // { '2025-01': { '食費': 50000, ... }, ... } 形式に変換
    const result = {};
    for (const row of data || []) {
      if (!result[row.month]) result[row.month] = {};
      result[row.month][row.category] = row.amount;
    }
    return result;
  },

  /**
   * 予算更新（Upsert）
   */
  async upsert(userId, month, category, amount) {
    const { error } = await supabase
      .from('budgets')
      .upsert(
        { user_id: userId, month, category, amount },
        { onConflict: 'user_id,month,category' }
      );

    if (error) throw error;
  },

  /**
   * 月別予算を一括更新
   */
  async bulkUpsert(userId, budgetData) {
    // budgetData: { '2025-01': { '食費': 50000, '交通費': 10000 }, ... }
    const records = [];

    for (const [month, categories] of Object.entries(budgetData)) {
      for (const [category, amount] of Object.entries(categories)) {
        records.push({ user_id: userId, month, category, amount });
      }
    }

    if (records.length === 0) return;

    const { error } = await supabase
      .from('budgets')
      .upsert(records, { onConflict: 'user_id,month,category' });

    if (error) throw error;
  }
};

export const gamification = {
  /**
   * ゲーミフィケーションデータ取得
   */
  async get(userId) {
    const { data, error } = await supabase
      .from('gamification')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || {
      level: 1,
      xp: 0,
      streak: 0,
      last_record_date: null,
      badges: [],
      challenges: []
    };
  },

  /**
   * ゲーミフィケーションデータ更新
   */
  async upsert(userId, data) {
    const { error } = await supabase
      .from('gamification')
      .upsert(
        { user_id: userId, ...data },
        { onConflict: 'user_id' }
      );

    if (error) throw error;
  }
};

export const linkedAccounts = {
  /**
   * 連携口座取得
   */
  async get(userId) {
    const { data, error } = await supabase
      .from('linked_accounts')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    // タイプ別にグループ化
    const result = { bank: [], credit: [], emoney: [], securities: [], points: [] };
    for (const account of data || []) {
      const type = account.account_type;
      if (result[type]) {
        result[type].push({
          name: account.name,
          balance: account.balance
        });
      }
    }
    return result;
  },

  /**
   * 連携口座更新
   */
  async upsert(userId, accounts) {
    // 既存データ削除
    await supabase
      .from('linked_accounts')
      .delete()
      .eq('user_id', userId);

    // 新規データ挿入
    const records = [];
    for (const [type, list] of Object.entries(accounts)) {
      for (const account of list) {
        records.push({
          user_id: userId,
          account_type: type,
          name: account.name,
          balance: account.balance
        });
      }
    }

    if (records.length > 0) {
      const { error } = await supabase
        .from('linked_accounts')
        .insert(records);

      if (error) throw error;
    }
  }
};

export const connectedAccounts = {
  /**
   * 接続アカウント取得（パスワードは復号して返す）
   */
  async get(userId) {
    const { data, error } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const result = {};
    for (const account of data || []) {
      result[account.service_id] = {
        isConnected: account.is_connected,
        loginId: account.login_id,
        // パスワードは暗号化されているので復号
        password: account.encrypted_password ? decrypt(account.encrypted_password) : null,
        lastSync: account.last_sync
      };
    }
    return result;
  },

  /**
   * 接続アカウント更新（パスワードは暗号化して保存）
   */
  async upsert(userId, serviceId, data) {
    const record = {
      user_id: userId,
      service_id: serviceId,
      is_connected: data.isConnected || false,
      login_id: data.loginId || null,
      // パスワードを暗号化
      encrypted_password: data.password ? encrypt(data.password) : null,
      last_sync: data.lastSync || null
    };

    const { error } = await supabase
      .from('connected_accounts')
      .upsert(record, { onConflict: 'user_id,service_id' });

    if (error) throw error;
  }
};

export const syncLogs = {
  /**
   * 同期ログ取得（最新100件）
   */
  async get(userId) {
    const { data, error } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('user_id', userId)
      .order('synced_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  },

  /**
   * 同期ログ追加
   */
  async add(userId, log) {
    const { error } = await supabase
      .from('sync_logs')
      .insert({
        user_id: userId,
        service_id: log.serviceId,
        status: log.status,
        message: log.message,
        synced_at: log.syncedAt || new Date().toISOString()
      });

    if (error) throw error;

    // 100件を超えた古いログを削除
    const { data: oldLogs } = await supabase
      .from('sync_logs')
      .select('id')
      .eq('user_id', userId)
      .order('synced_at', { ascending: false })
      .range(100, 1000);

    if (oldLogs && oldLogs.length > 0) {
      const idsToDelete = oldLogs.map(l => l.id);
      await supabase
        .from('sync_logs')
        .delete()
        .in('id', idsToDelete);
    }
  }
};

// ============================================
// 一括データ操作
// ============================================

export const allData = {
  /**
   * 全データ取得（エクスポート用）
   */
  async export(userId) {
    const [
      expensesData,
      incomesData,
      budgetsData,
      subscriptionsData,
      goalsData,
      familyData,
      gamificationData,
      linkedAccountsData,
      quickInputsData
    ] = await Promise.all([
      expenses.findAll(userId, { limit: PAGINATION.MAX_LIMIT }),
      incomes.findAll(userId, { limit: PAGINATION.MAX_LIMIT }),
      budgets.findAll(userId),
      subscriptions.findAll(userId, { limit: PAGINATION.MAX_LIMIT }),
      goals.findAll(userId, { limit: PAGINATION.MAX_LIMIT }),
      familyMembers.findAll(userId, { limit: PAGINATION.MAX_LIMIT }),
      gamification.get(userId),
      linkedAccounts.get(userId),
      quickInputs.findAll(userId, { limit: PAGINATION.MAX_LIMIT })
    ]);

    return {
      expenses: expensesData.data,
      incomes: incomesData.data,
      budgets: budgetsData,
      subscriptions: subscriptionsData.data,
      goals: goalsData.data,
      familyMembers: familyData.data,
      gamification: gamificationData,
      linkedAccounts: linkedAccountsData,
      quickInputs: quickInputsData.data,
      exportedAt: new Date().toISOString()
    };
  },

  /**
   * 全データ削除
   */
  async deleteAll(userId) {
    await Promise.all([
      expenses.deleteAll(userId),
      incomes.deleteAll(userId),
      subscriptions.deleteAll(userId),
      goals.deleteAll(userId),
      familyMembers.deleteAll(userId),
      quickInputs.deleteAll(userId),
      supabase.from('budgets').delete().eq('user_id', userId),
      supabase.from('gamification').delete().eq('user_id', userId),
      supabase.from('linked_accounts').delete().eq('user_id', userId),
      supabase.from('connected_accounts').delete().eq('user_id', userId),
      supabase.from('sync_logs').delete().eq('user_id', userId)
    ]);
  }
};
