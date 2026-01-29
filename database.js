// データベース管理モジュール（ユーザー別データ対応）
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'household.db');
const SALT_ROUNDS = 10;
const SESSION_EXPIRY_DAYS = 30;

let db;

function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
    }
    return db;
}

// ========================================
// テーブル作成
// ========================================
function initializeDatabase() {
    const db = getDb();

    db.exec(`
        -- ユーザーテーブル
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            display_name TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            updated_at TEXT DEFAULT (datetime('now', 'localtime'))
        );

        -- セッションテーブル
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- 支出テーブル
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY,
            user_id TEXT NOT NULL,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            amount INTEGER NOT NULL,
            category TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- 収入テーブル
        CREATE TABLE IF NOT EXISTS incomes (
            id INTEGER PRIMARY KEY,
            user_id TEXT NOT NULL,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            amount INTEGER NOT NULL,
            category TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- 予算テーブル
        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            month TEXT NOT NULL,
            category TEXT NOT NULL,
            amount INTEGER NOT NULL,
            UNIQUE(user_id, month, category),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- 定期支出テーブル
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            amount INTEGER NOT NULL,
            category TEXT NOT NULL,
            cycle TEXT NOT NULL DEFAULT 'monthly',
            pay_day INTEGER DEFAULT 1,
            start_date TEXT,
            notify INTEGER DEFAULT 0,
            active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- 目標テーブル
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            icon TEXT DEFAULT '🎯',
            target INTEGER NOT NULL,
            deadline TEXT,
            current INTEGER DEFAULT 0,
            deposits TEXT DEFAULT '[]',
            completed INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- 家族メンバーテーブル
        CREATE TABLE IF NOT EXISTS family_members (
            id INTEGER PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            icon TEXT DEFAULT '👤',
            role TEXT DEFAULT 'member',
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- ゲーミフィケーションテーブル
        CREATE TABLE IF NOT EXISTS gamification (
            user_id TEXT PRIMARY KEY,
            level INTEGER DEFAULT 1,
            exp INTEGER DEFAULT 0,
            current_streak INTEGER DEFAULT 0,
            max_streak INTEGER DEFAULT 0,
            last_record_date TEXT,
            badges TEXT DEFAULT '[]',
            challenges TEXT DEFAULT '[]',
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- 連携口座テーブル
        CREATE TABLE IF NOT EXISTS linked_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            balance REAL DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- アカウント連携テーブル
        CREATE TABLE IF NOT EXISTS connected_accounts (
            user_id TEXT NOT NULL,
            service TEXT NOT NULL,
            is_connected INTEGER DEFAULT 0,
            connected_at TEXT,
            last_sync TEXT,
            login_id TEXT,
            login_password TEXT,
            PRIMARY KEY (user_id, service),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- 同期ログテーブル
        CREATE TABLE IF NOT EXISTS sync_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- クイック入力テーブル
        CREATE TABLE IF NOT EXISTS quick_inputs (
            id INTEGER PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            amount INTEGER NOT NULL,
            category TEXT NOT NULL,
            icon TEXT DEFAULT '⚡',
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- インデックス
        CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
        CREATE INDEX IF NOT EXISTS idx_incomes_user ON incomes(user_id);
        CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
        CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    `);

    // 期限切れセッションを削除
    getDb().prepare("DELETE FROM sessions WHERE expires_at < datetime('now', 'localtime')").run();

    console.log('データベースを初期化しました');
    return db;
}

// ========================================
// ユーザー管理
// ========================================
const usersDb = {
    create(username, email, password, displayName) {
        const id = uuidv4();
        const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
        const stmt = getDb().prepare(
            'INSERT INTO users (id, username, email, password_hash, display_name) VALUES (?, ?, ?, ?, ?)'
        );
        stmt.run(id, username, email || null, passwordHash, displayName || username);

        // ゲーミフィケーション初期データを作成
        getDb().prepare(
            'INSERT INTO gamification (user_id, level, exp, current_streak, max_streak, badges, challenges) VALUES (?, 1, 0, 0, 0, \'[]\', \'[]\')'
        ).run(id);

        return { id, username, email, displayName: displayName || username };
    },

    findByUsername(username) {
        return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username);
    },

    findById(id) {
        const row = getDb().prepare('SELECT id, username, email, display_name, created_at FROM users WHERE id = ?').get(id);
        if (!row) return null;
        return { id: row.id, username: row.username, email: row.email, displayName: row.display_name, createdAt: row.created_at };
    },

    verifyPassword(user, password) {
        return bcrypt.compareSync(password, user.password_hash);
    },

    updateProfile(id, data) {
        const fields = [];
        const values = [];
        if (data.displayName !== undefined) { fields.push('display_name = ?'); values.push(data.displayName); }
        if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
        if (fields.length === 0) return;
        fields.push("updated_at = datetime('now', 'localtime')");
        values.push(id);
        getDb().prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    },

    changePassword(id, newPassword) {
        const passwordHash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
        getDb().prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(passwordHash, id);
    },

    deleteUser(id) {
        getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
    }
};

// ========================================
// セッション管理
// ========================================
const sessionsDb = {
    create(userId) {
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        const expiresStr = expiresAt.toISOString().replace('T', ' ').slice(0, 19);
        getDb().prepare(
            'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
        ).run(token, userId, expiresStr);
        return { token, expiresAt: expiresStr };
    },

    validate(token) {
        const session = getDb().prepare(
            "SELECT s.*, u.id as uid, u.username, u.email, u.display_name FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now', 'localtime')"
        ).get(token);
        if (!session) return null;
        return {
            userId: session.user_id,
            username: session.username,
            email: session.email,
            displayName: session.display_name
        };
    },

    delete(token) {
        getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
    },

    deleteAllForUser(userId) {
        getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    },

    cleanup() {
        getDb().prepare("DELETE FROM sessions WHERE expires_at < datetime('now', 'localtime')").run();
    }
};

// ========================================
// 支出 CRUD（ユーザー別）
// ========================================
const expenses = {
    getAll(userId) {
        return getDb().prepare('SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC, id DESC').all(userId);
    },
    getById(userId, id) {
        return getDb().prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(id, userId);
    },
    create(userId, expense) {
        const stmt = getDb().prepare(
            'INSERT INTO expenses (id, user_id, date, description, amount, category) VALUES (?, ?, ?, ?, ?, ?)'
        );
        stmt.run(expense.id, userId, expense.date, expense.description, expense.amount, expense.category);
        return expense;
    },
    update(userId, id, data) {
        const stmt = getDb().prepare(
            'UPDATE expenses SET date = ?, description = ?, amount = ?, category = ? WHERE id = ? AND user_id = ?'
        );
        stmt.run(data.date, data.description, data.amount, data.category, id, userId);
        return this.getById(userId, id);
    },
    delete(userId, id) {
        getDb().prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').run(id, userId);
    },
    deleteAll(userId) {
        getDb().prepare('DELETE FROM expenses WHERE user_id = ?').run(userId);
    },
    bulkInsert(userId, items) {
        const stmt = getDb().prepare(
            'INSERT OR REPLACE INTO expenses (id, user_id, date, description, amount, category) VALUES (?, ?, ?, ?, ?, ?)'
        );
        const insertMany = getDb().transaction((items) => {
            for (const item of items) {
                stmt.run(item.id, userId, item.date, item.description, item.amount, item.category);
            }
        });
        insertMany(items);
    }
};

// ========================================
// 収入 CRUD（ユーザー別）
// ========================================
const incomes = {
    getAll(userId) {
        return getDb().prepare('SELECT * FROM incomes WHERE user_id = ? ORDER BY date DESC, id DESC').all(userId);
    },
    create(userId, income) {
        const stmt = getDb().prepare(
            'INSERT INTO incomes (id, user_id, date, description, amount, category) VALUES (?, ?, ?, ?, ?, ?)'
        );
        stmt.run(income.id, userId, income.date, income.description, income.amount, income.category);
        return income;
    },
    delete(userId, id) {
        getDb().prepare('DELETE FROM incomes WHERE id = ? AND user_id = ?').run(id, userId);
    },
    deleteAll(userId) {
        getDb().prepare('DELETE FROM incomes WHERE user_id = ?').run(userId);
    },
    bulkInsert(userId, items) {
        const stmt = getDb().prepare(
            'INSERT OR REPLACE INTO incomes (id, user_id, date, description, amount, category) VALUES (?, ?, ?, ?, ?, ?)'
        );
        const insertMany = getDb().transaction((items) => {
            for (const item of items) {
                stmt.run(item.id, userId, item.date, item.description, item.amount, item.category);
            }
        });
        insertMany(items);
    }
};

// ========================================
// 予算 CRUD（ユーザー別）
// ========================================
const budgetsDb = {
    getAll(userId) {
        const rows = getDb().prepare('SELECT month, category, amount FROM budgets WHERE user_id = ? ORDER BY month DESC').all(userId);
        const result = {};
        for (const row of rows) {
            if (!result[row.month]) result[row.month] = {};
            result[row.month][row.category] = row.amount;
        }
        return result;
    },
    save(userId, budgetData) {
        const deleteStmt = getDb().prepare('DELETE FROM budgets WHERE user_id = ?');
        const insertStmt = getDb().prepare('INSERT INTO budgets (user_id, month, category, amount) VALUES (?, ?, ?, ?)');
        const saveAll = getDb().transaction((data) => {
            deleteStmt.run(userId);
            for (const [month, categories] of Object.entries(data)) {
                for (const [category, amount] of Object.entries(categories)) {
                    insertStmt.run(userId, month, category, amount);
                }
            }
        });
        saveAll(budgetData);
    },
    deleteAll(userId) {
        getDb().prepare('DELETE FROM budgets WHERE user_id = ?').run(userId);
    }
};

// ========================================
// 定期支出 CRUD（ユーザー別）
// ========================================
const subscriptionsDb = {
    getAll(userId) {
        const rows = getDb().prepare('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY id DESC').all(userId);
        return rows.map(r => ({ ...r, notify: !!r.notify, active: !!r.active }));
    },
    create(userId, sub) {
        const stmt = getDb().prepare(
            'INSERT INTO subscriptions (id, user_id, name, amount, category, cycle, pay_day, start_date, notify, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        stmt.run(sub.id, userId, sub.name, sub.amount, sub.category, sub.cycle, sub.payDay, sub.startDate, sub.notify ? 1 : 0, sub.active ? 1 : 0);
        return sub;
    },
    update(userId, id, data) {
        const stmt = getDb().prepare(
            'UPDATE subscriptions SET name = ?, amount = ?, category = ?, cycle = ?, pay_day = ?, start_date = ?, notify = ?, active = ? WHERE id = ? AND user_id = ?'
        );
        stmt.run(data.name, data.amount, data.category, data.cycle, data.payDay, data.startDate, data.notify ? 1 : 0, data.active ? 1 : 0, id, userId);
    },
    delete(userId, id) {
        getDb().prepare('DELETE FROM subscriptions WHERE id = ? AND user_id = ?').run(id, userId);
    },
    deleteAll(userId) {
        getDb().prepare('DELETE FROM subscriptions WHERE user_id = ?').run(userId);
    },
    bulkInsert(userId, items) {
        const stmt = getDb().prepare(
            'INSERT OR REPLACE INTO subscriptions (id, user_id, name, amount, category, cycle, pay_day, start_date, notify, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        const insertMany = getDb().transaction((items) => {
            for (const item of items) {
                stmt.run(item.id, userId, item.name, item.amount, item.category, item.cycle, item.payDay, item.startDate, item.notify ? 1 : 0, item.active ? 1 : 0);
            }
        });
        insertMany(items);
    }
};

// ========================================
// 目標 CRUD（ユーザー別）
// ========================================
const goalsDb = {
    getAll(userId) {
        const rows = getDb().prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY id DESC').all(userId);
        return rows.map(r => ({ ...r, deposits: JSON.parse(r.deposits || '[]'), completed: !!r.completed }));
    },
    create(userId, goal) {
        const stmt = getDb().prepare(
            'INSERT INTO goals (id, user_id, name, icon, target, deadline, current, deposits, completed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        stmt.run(goal.id, userId, goal.name, goal.icon, goal.target, goal.deadline, goal.current || 0,
            JSON.stringify(goal.deposits || []), goal.completed ? 1 : 0, goal.createdAt);
        return goal;
    },
    update(userId, id, data) {
        const stmt = getDb().prepare(
            'UPDATE goals SET name = ?, icon = ?, target = ?, deadline = ?, current = ?, deposits = ?, completed = ? WHERE id = ? AND user_id = ?'
        );
        stmt.run(data.name, data.icon, data.target, data.deadline, data.current,
            JSON.stringify(data.deposits || []), data.completed ? 1 : 0, id, userId);
    },
    delete(userId, id) {
        getDb().prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(id, userId);
    },
    deleteAll(userId) {
        getDb().prepare('DELETE FROM goals WHERE user_id = ?').run(userId);
    },
    bulkInsert(userId, items) {
        const stmt = getDb().prepare(
            'INSERT OR REPLACE INTO goals (id, user_id, name, icon, target, deadline, current, deposits, completed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        const insertMany = getDb().transaction((items) => {
            for (const item of items) {
                stmt.run(item.id, userId, item.name, item.icon, item.target, item.deadline, item.current || 0,
                    JSON.stringify(item.deposits || []), item.completed ? 1 : 0, item.createdAt);
            }
        });
        insertMany(items);
    }
};

// ========================================
// 家族メンバー CRUD（ユーザー別）
// ========================================
const familyDb = {
    getAll(userId) {
        return getDb().prepare('SELECT * FROM family_members WHERE user_id = ? ORDER BY id').all(userId);
    },
    create(userId, member) {
        const stmt = getDb().prepare(
            'INSERT INTO family_members (id, user_id, name, icon, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        );
        stmt.run(member.id, userId, member.name, member.icon, member.role, member.createdAt);
        return member;
    },
    delete(userId, id) {
        getDb().prepare('DELETE FROM family_members WHERE id = ? AND user_id = ?').run(id, userId);
    },
    deleteAll(userId) {
        getDb().prepare('DELETE FROM family_members WHERE user_id = ?').run(userId);
    },
    bulkInsert(userId, items) {
        const stmt = getDb().prepare(
            'INSERT OR REPLACE INTO family_members (id, user_id, name, icon, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        );
        const insertMany = getDb().transaction((items) => {
            for (const item of items) {
                stmt.run(item.id, userId, item.name, item.icon, item.role, item.createdAt);
            }
        });
        insertMany(items);
    }
};

// ========================================
// ゲーミフィケーション（ユーザー別）
// ========================================
const gamificationDb = {
    get(userId) {
        const row = getDb().prepare('SELECT * FROM gamification WHERE user_id = ?').get(userId);
        if (!row) return { level: 1, exp: 0, currentStreak: 0, maxStreak: 0, lastRecordDate: null, badges: [], challenges: [] };
        return {
            level: row.level, exp: row.exp, currentStreak: row.current_streak,
            maxStreak: row.max_streak, lastRecordDate: row.last_record_date,
            badges: JSON.parse(row.badges || '[]'), challenges: JSON.parse(row.challenges || '[]')
        };
    },
    save(userId, data) {
        getDb().prepare(
            'INSERT OR REPLACE INTO gamification (user_id, level, exp, current_streak, max_streak, last_record_date, badges, challenges) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(userId, data.level, data.exp, data.currentStreak, data.maxStreak, data.lastRecordDate,
            JSON.stringify(data.badges || []), JSON.stringify(data.challenges || []));
    }
};

// ========================================
// 連携口座（ユーザー別）
// ========================================
const linkedAccountsDb = {
    getAll(userId) {
        const rows = getDb().prepare('SELECT * FROM linked_accounts WHERE user_id = ? ORDER BY id').all(userId);
        const result = { bank: [], securities: [], credit: [], emoney: [], qr: [], points: [], ec: [] };
        for (const row of rows) {
            if (result[row.type]) result[row.type].push({ name: row.name, balance: row.balance });
        }
        return result;
    },
    save(userId, accounts) {
        const deleteStmt = getDb().prepare('DELETE FROM linked_accounts WHERE user_id = ?');
        const insertStmt = getDb().prepare('INSERT INTO linked_accounts (user_id, type, name, balance) VALUES (?, ?, ?, ?)');
        const saveAll = getDb().transaction((data) => {
            deleteStmt.run(userId);
            for (const [type, items] of Object.entries(data)) {
                for (const item of items) { insertStmt.run(userId, type, item.name, item.balance || 0); }
            }
        });
        saveAll(accounts);
    }
};

// ========================================
// アカウント連携設定（ユーザー別）
// ========================================
const connectedAccountsDb = {
    getAll(userId) {
        const rows = getDb().prepare('SELECT * FROM connected_accounts WHERE user_id = ?').all(userId);
        const result = {};
        for (const row of rows) {
            result[row.service] = {
                isConnected: !!row.is_connected, connectedAt: row.connected_at,
                lastSync: row.last_sync, loginId: row.login_id, loginPassword: row.login_password
            };
        }
        return result;
    },
    save(userId, configs) {
        const deleteStmt = getDb().prepare('DELETE FROM connected_accounts WHERE user_id = ?');
        const insertStmt = getDb().prepare(
            'INSERT INTO connected_accounts (user_id, service, is_connected, connected_at, last_sync, login_id, login_password) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        const saveAll = getDb().transaction((data) => {
            deleteStmt.run(userId);
            for (const [service, config] of Object.entries(data)) {
                insertStmt.run(userId, service, config.isConnected ? 1 : 0, config.connectedAt, config.lastSync, config.loginId, config.loginPassword);
            }
        });
        saveAll(configs);
    }
};

// ========================================
// 同期ログ（ユーザー別）
// ========================================
const syncLogsDb = {
    getAll(userId) {
        return getDb().prepare('SELECT type, message, timestamp FROM sync_logs WHERE user_id = ? ORDER BY id DESC LIMIT 100').all(userId);
    },
    save(userId, logs) {
        const deleteStmt = getDb().prepare('DELETE FROM sync_logs WHERE user_id = ?');
        const insertStmt = getDb().prepare('INSERT INTO sync_logs (user_id, type, message, timestamp) VALUES (?, ?, ?, ?)');
        const saveAll = getDb().transaction((items) => {
            deleteStmt.run(userId);
            for (const log of items.slice(-100)) { insertStmt.run(userId, log.type, log.message, log.timestamp); }
        });
        saveAll(logs);
    }
};

// ========================================
// クイック入力（ユーザー別）
// ========================================
const quickInputsDb = {
    getAll(userId) {
        return getDb().prepare('SELECT * FROM quick_inputs WHERE user_id = ? ORDER BY id').all(userId);
    },
    create(userId, input) {
        getDb().prepare(
            'INSERT INTO quick_inputs (id, user_id, name, amount, category, icon) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(input.id, userId, input.name, input.amount, input.category, input.icon);
        return input;
    },
    delete(userId, id) {
        getDb().prepare('DELETE FROM quick_inputs WHERE id = ? AND user_id = ?').run(id, userId);
    },
    deleteAll(userId) {
        getDb().prepare('DELETE FROM quick_inputs WHERE user_id = ?').run(userId);
    },
    bulkInsert(userId, items) {
        const stmt = getDb().prepare(
            'INSERT OR REPLACE INTO quick_inputs (id, user_id, name, amount, category, icon) VALUES (?, ?, ?, ?, ?, ?)'
        );
        const insertMany = getDb().transaction((items) => {
            for (const item of items) { stmt.run(item.id, userId, item.name, item.amount, item.category, item.icon); }
        });
        insertMany(items);
    }
};

// データベースを閉じる
function closeDatabase() {
    if (db) { db.close(); db = null; }
}

module.exports = {
    initializeDatabase, closeDatabase, getDb,
    users: usersDb, sessions: sessionsDb,
    expenses, incomes, budgets: budgetsDb, subscriptions: subscriptionsDb,
    goals: goalsDb, family: familyDb, gamification: gamificationDb,
    linkedAccounts: linkedAccountsDb, connectedAccounts: connectedAccountsDb,
    syncLogs: syncLogsDb, quickInputs: quickInputsDb
};
