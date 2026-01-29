// データベース管理モジュール（Supabase版）
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const SALT_ROUNDS = 10;
const SESSION_EXPIRY_DAYS = 30;

// Supabase クライアント初期化
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('警告: SUPABASE_URL または SUPABASE_ANON_KEY が設定されていません');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// 初期化（テーブルは Supabase ダッシュボードで作成済み前提）
async function initializeDatabase() {
    if (!supabase) {
        console.error('Supabase が設定されていません。環境変数を確認してください。');
        return;
    }
    console.log('Supabase に接続しました');
}

function getDbReady() {
    return Promise.resolve();
}

function closeDatabase() {
    // Supabase は明示的なクローズ不要
}

// ========================================
// ユーザー管理
// ========================================
const usersDb = {
    async create(username, email, password, displayName) {
        const id = uuidv4();
        const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
        const now = new Date().toISOString();

        const { error } = await supabase.from('users').insert({
            id, username, email: email || null,
            password_hash: passwordHash,
            display_name: displayName || username,
            created_at: now, updated_at: now
        });
        if (error) throw error;

        // ゲーミフィケーション初期データ
        await supabase.from('gamification').insert({
            user_id: id, level: 1, exp: 0,
            current_streak: 0, max_streak: 0,
            badges: [], challenges: []
        });

        return { id, username, email, displayName: displayName || username };
    },

    async findByUsername(username) {
        const { data } = await supabase.from('users').select('*').eq('username', username).single();
        return data;
    },

    async findById(id) {
        const { data } = await supabase.from('users')
            .select('id, username, email, display_name, created_at')
            .eq('id', id).single();
        if (!data) return null;
        return { id: data.id, username: data.username, email: data.email, displayName: data.display_name, createdAt: data.created_at };
    },

    verifyPassword(user, password) {
        return bcrypt.compareSync(password, user.password_hash);
    },

    async updateProfile(id, data) {
        const updates = { updated_at: new Date().toISOString() };
        if (data.displayName !== undefined) updates.display_name = data.displayName;
        if (data.email !== undefined) updates.email = data.email;
        await supabase.from('users').update(updates).eq('id', id);
    },

    async changePassword(id, newPassword) {
        const passwordHash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
        await supabase.from('users').update({
            password_hash: passwordHash,
            updated_at: new Date().toISOString()
        }).eq('id', id);
    },

    async deleteUser(id) {
        await supabase.from('users').delete().eq('id', id);
    }
};

// ========================================
// セッション管理
// ========================================
const sessionsDb = {
    async create(userId) {
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const now = new Date().toISOString();

        await supabase.from('sessions').insert({
            token, user_id: userId, created_at: now, expires_at: expiresAt
        });
        return { token, expiresAt };
    },

    async validate(token) {
        const now = new Date().toISOString();
        const { data } = await supabase.from('sessions')
            .select('*, users(id, username, email, display_name)')
            .eq('token', token)
            .gt('expires_at', now)
            .single();

        if (!data || !data.users) return null;
        return {
            userId: data.user_id,
            username: data.users.username,
            email: data.users.email,
            displayName: data.users.display_name
        };
    },

    async delete(token) {
        await supabase.from('sessions').delete().eq('token', token);
    },

    async deleteAllForUser(userId) {
        await supabase.from('sessions').delete().eq('user_id', userId);
    },

    async cleanup() {
        const now = new Date().toISOString();
        await supabase.from('sessions').delete().lt('expires_at', now);
    }
};

// ========================================
// 汎用CRUD（ユーザー別）
// ========================================
function createCRUD(tableName) {
    return {
        async getAll(userId) {
            const { data } = await supabase.from(tableName)
                .select('*').eq('user_id', userId).order('id', { ascending: false });
            return data || [];
        },
        async create(userId, item) {
            const { error } = await supabase.from(tableName).insert({ ...item, user_id: userId });
            if (error) throw error;
            return item;
        },
        async update(userId, id, data) {
            await supabase.from(tableName).update(data).eq('id', id).eq('user_id', userId);
        },
        async delete(userId, id) {
            await supabase.from(tableName).delete().eq('id', id).eq('user_id', userId);
        },
        async deleteAll(userId) {
            await supabase.from(tableName).delete().eq('user_id', userId);
        },
        async bulkInsert(userId, items) {
            if (!items.length) return;
            const rows = items.map(item => ({ ...item, user_id: userId }));
            await supabase.from(tableName).insert(rows);
        },
        async replaceAll(userId, items) {
            await supabase.from(tableName).delete().eq('user_id', userId);
            if (Array.isArray(items) && items.length) {
                const rows = items.map(item => ({ ...item, user_id: userId }));
                await supabase.from(tableName).insert(rows);
            }
        }
    };
}

const expenses = createCRUD('expenses');
const incomes = createCRUD('incomes');
const subscriptions = createCRUD('subscriptions');
const goals = createCRUD('goals');
const familyMembers = createCRUD('family_members');
const quickInputs = createCRUD('quick_inputs');

// 予算（オブジェクト形式）
const budgets = {
    async getAll(userId) {
        const { data } = await supabase.from('budgets').select('month, category, amount').eq('user_id', userId);
        const result = {};
        (data || []).forEach(r => {
            if (!result[r.month]) result[r.month] = {};
            result[r.month][r.category] = r.amount;
        });
        return result;
    },
    async replaceAll(userId, budgetData) {
        await supabase.from('budgets').delete().eq('user_id', userId);
        const rows = [];
        for (const [month, cats] of Object.entries(budgetData)) {
            for (const [category, amount] of Object.entries(cats)) {
                rows.push({ user_id: userId, month, category, amount });
            }
        }
        if (rows.length) await supabase.from('budgets').insert(rows);
    }
};

// ゲーミフィケーション
const gamification = {
    async get(userId) {
        const { data } = await supabase.from('gamification').select('*').eq('user_id', userId).single();
        if (!data) return { level: 1, exp: 0, currentStreak: 0, maxStreak: 0, lastRecordDate: null, badges: [], challenges: [] };
        return {
            level: data.level,
            exp: data.exp,
            currentStreak: data.current_streak,
            maxStreak: data.max_streak,
            lastRecordDate: data.last_record_date,
            badges: data.badges || [],
            challenges: data.challenges || []
        };
    },
    async update(userId, gData) {
        const row = {
            user_id: userId,
            level: gData.level || 1,
            exp: gData.exp || 0,
            current_streak: gData.currentStreak || 0,
            max_streak: gData.maxStreak || 0,
            last_record_date: gData.lastRecordDate || null,
            badges: gData.badges || [],
            challenges: gData.challenges || []
        };
        await supabase.from('gamification').upsert(row, { onConflict: 'user_id' });
    }
};

// 連携口座
const linkedAccounts = {
    async get(userId) {
        const { data } = await supabase.from('linked_accounts').select('type, name, balance').eq('user_id', userId);
        const result = { bank: [], securities: [], credit: [], emoney: [], qr: [], points: [], ec: [] };
        (data || []).forEach(r => {
            if (result[r.type]) result[r.type].push({ name: r.name, balance: r.balance });
        });
        return result;
    },
    async update(userId, accounts) {
        await supabase.from('linked_accounts').delete().eq('user_id', userId);
        const rows = [];
        for (const [type, list] of Object.entries(accounts)) {
            if (Array.isArray(list)) {
                list.forEach(acc => rows.push({ user_id: userId, type, name: acc.name, balance: acc.balance || 0 }));
            }
        }
        if (rows.length) await supabase.from('linked_accounts').insert(rows);
    }
};

// 接続アカウント
const connectedAccounts = {
    async get(userId) {
        const { data } = await supabase.from('connected_accounts').select('*').eq('user_id', userId);
        const result = {};
        (data || []).forEach(r => {
            result[r.service] = { isConnected: r.is_connected, connectedAt: r.connected_at, lastSync: r.last_sync, loginId: r.login_id };
        });
        return result;
    },
    async update(userId, accounts) {
        await supabase.from('connected_accounts').delete().eq('user_id', userId);
        const rows = [];
        for (const [service, info] of Object.entries(accounts)) {
            rows.push({
                user_id: userId, service,
                is_connected: info.isConnected || false,
                connected_at: info.connectedAt || null,
                last_sync: info.lastSync || null,
                login_id: info.loginId || null,
                login_password: info.loginPassword || null
            });
        }
        if (rows.length) await supabase.from('connected_accounts').insert(rows);
    }
};

// 同期ログ
const syncLogs = {
    async get(userId) {
        const { data } = await supabase.from('sync_logs')
            .select('type, message, timestamp')
            .eq('user_id', userId)
            .order('id', { ascending: false })
            .limit(100);
        return data || [];
    },
    async add(userId, type, message) {
        await supabase.from('sync_logs').insert({
            user_id: userId, type, message, timestamp: new Date().toISOString()
        });
    },
    async clear(userId) {
        await supabase.from('sync_logs').delete().eq('user_id', userId);
    },
    async update(userId, logs) {
        await supabase.from('sync_logs').delete().eq('user_id', userId);
        if (logs.length) {
            const rows = logs.map(l => ({ user_id: userId, type: l.type, message: l.message, timestamp: l.timestamp }));
            await supabase.from('sync_logs').insert(rows);
        }
    }
};

module.exports = {
    initializeDatabase,
    getDbReady,
    closeDatabase,
    users: usersDb,
    sessions: sessionsDb,
    expenses,
    incomes,
    budgets,
    subscriptions,
    goals,
    familyMembers,
    gamification,
    linkedAccounts,
    connectedAccounts,
    syncLogs,
    quickInputs
};
