// データベース管理モジュール
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'household.db');

let db;

function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
    }
    return db;
}

// テーブル作成
function initializeDatabase() {
    const db = getDb();

    db.exec(`
        -- 支出テーブル
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            amount INTEGER NOT NULL,
            category TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        );

        -- 収入テーブル
        CREATE TABLE IF NOT EXISTS incomes (
            id INTEGER PRIMARY KEY,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            amount INTEGER NOT NULL,
            category TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        );

        -- 予算テーブル
        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            month TEXT NOT NULL,
            category TEXT NOT NULL,
            amount INTEGER NOT NULL,
            UNIQUE(month, category)
        );

        -- 定期支出（サブスクリプション）テーブル
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            amount INTEGER NOT NULL,
            category TEXT NOT NULL,
            cycle TEXT NOT NULL DEFAULT 'monthly',
            pay_day INTEGER DEFAULT 1,
            start_date TEXT,
            notify INTEGER DEFAULT 0,
            active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        );

        -- 目標テーブル
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT DEFAULT '🎯',
            target INTEGER NOT NULL,
            deadline TEXT,
            current INTEGER DEFAULT 0,
            deposits TEXT DEFAULT '[]',
            completed INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        );

        -- 家族メンバーテーブル
        CREATE TABLE IF NOT EXISTS family_members (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT DEFAULT '👤',
            role TEXT DEFAULT 'member',
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        );

        -- ゲーミフィケーションテーブル
        CREATE TABLE IF NOT EXISTS gamification (
            id INTEGER PRIMARY KEY DEFAULT 1,
            level INTEGER DEFAULT 1,
            exp INTEGER DEFAULT 0,
            current_streak INTEGER DEFAULT 0,
            max_streak INTEGER DEFAULT 0,
            last_record_date TEXT,
            badges TEXT DEFAULT '[]',
            challenges TEXT DEFAULT '[]'
        );

        -- 連携口座テーブル
        CREATE TABLE IF NOT EXISTS linked_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            balance REAL DEFAULT 0
        );

        -- アカウント連携テーブル
        CREATE TABLE IF NOT EXISTS connected_accounts (
            service TEXT PRIMARY KEY,
            is_connected INTEGER DEFAULT 0,
            connected_at TEXT,
            last_sync TEXT,
            login_id TEXT,
            login_password TEXT
        );

        -- 同期ログテーブル
        CREATE TABLE IF NOT EXISTS sync_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp TEXT DEFAULT (datetime('now', 'localtime'))
        );

        -- クイック入力テーブル
        CREATE TABLE IF NOT EXISTS quick_inputs (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            amount INTEGER NOT NULL,
            category TEXT NOT NULL,
            icon TEXT DEFAULT '⚡'
        );

        -- ゲーミフィケーション初期データ
        INSERT OR IGNORE INTO gamification (id, level, exp, current_streak, max_streak, badges, challenges)
        VALUES (1, 1, 0, 0, 0, '[]', '[]');
    `);

    console.log('データベースを初期化しました');
    return db;
}

// ========================================
// 支出 CRUD
// ========================================
const expenses = {
    getAll() {
        return getDb().prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all();
    },
    getById(id) {
        return getDb().prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    },
    create(expense) {
        const stmt = getDb().prepare(
            'INSERT INTO expenses (id, date, description, amount, category) VALUES (?, ?, ?, ?, ?)'
        );
        stmt.run(expense.id, expense.date, expense.description, expense.amount, expense.category);
        return expense;
    },
    update(id, data) {
        const stmt = getDb().prepare(
            'UPDATE expenses SET date = ?, description = ?, amount = ?, category = ? WHERE id = ?'
        );
        stmt.run(data.date, data.description, data.amount, data.category, id);
        return this.getById(id);
    },
    delete(id) {
        getDb().prepare('DELETE FROM expenses WHERE id = ?').run(id);
    },
    deleteAll() {
        getDb().prepare('DELETE FROM expenses').run();
    },
    bulkInsert(items) {
        const stmt = getDb().prepare(
            'INSERT OR REPLACE INTO expenses (id, date, description, amount, category) VALUES (?, ?, ?, ?, ?)'
        );
        const insertMany = getDb().transaction((items) => {
            for (const item of items) {
                stmt.run(item.id, item.date, item.description, item.amount, item.category);
            }
        });
        insertMany(items);
    }
};

// ========================================
// 収入 CRUD
// ========================================
const incomes = {
    getAll() {
        return getDb().prepare('SELECT * FROM incomes ORDER BY date DESC, id DESC').all();
    },
    create(income) {
        const stmt = getDb().prepare(
            'INSERT INTO incomes (id, date, description, amount, category) VALUES (?, ?, ?, ?, ?)'
        );
        stmt.run(income.id, income.date, income.description, income.amount, income.category);
        return income;
    },
    delete(id) {
        getDb().prepare('DELETE FROM incomes WHERE id = ?').run(id);
    },
    deleteAll() {
        getDb().prepare('DELETE FROM incomes').run();
    },
    bulkInsert(items) {
        const stmt = getDb().prepare(
            'INSERT OR REPLACE INTO incomes (id, date, description, amount, category) VALUES (?, ?, ?, ?, ?)'
        );
        const insertMany = getDb().transaction((items) => {
            for (const item of items) {
                stmt.run(item.id, item.date, item.description, item.amount, item.category);
            }
        });
        insertMany(items);
    }
};

// ========================================
// 予算 CRUD
// ========================================
const budgetsDb = {
    getAll() {
        const rows = getDb().prepare('SELECT month, category, amount FROM budgets ORDER BY month DESC').all();
        const result = {};
        for (const row of rows) {
            if (!result[row.month]) result[row.month] = {};
            result[row.month][row.category] = row.amount;
        }
        return result;
    },
    save(budgetData) {
        const deleteStmt = getDb().prepare('DELETE FROM budgets');
        const insertStmt = getDb().prepare(
            'INSERT INTO budgets (month, category, amount) VALUES (?, ?, ?)'
        );
        const saveAll = getDb().transaction((data) => {
            deleteStmt.run();
            for (const [month, categories] of Object.entries(data)) {
                for (const [category, amount] of Object.entries(categories)) {
                    insertStmt.run(month, category, amount);
                }
            }
        });
        saveAll(budgetData);
    },
    deleteAll() {
        getDb().prepare('DELETE FROM budgets').run();
    }
};

// ========================================
// 定期支出 CRUD
// ========================================
const subscriptionsDb = {
    getAll() {
        const rows = getDb().prepare('SELECT * FROM subscriptions ORDER BY id DESC').all();
        return rows.map(r => ({ ...r, notify: !!r.notify, active: !!r.active }));
    },
    create(sub) {
        const stmt = getDb().prepare(
            'INSERT INTO subscriptions (id, name, amount, category, cycle, pay_day, start_date, notify, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        stmt.run(sub.id, sub.name, sub.amount, sub.category, sub.cycle, sub.payDay, sub.startDate, sub.notify ? 1 : 0, sub.active ? 1 : 0);
        return sub;
    },
    update(id, data) {
        const stmt = getDb().prepare(
            'UPDATE subscriptions SET name = ?, amount = ?, category = ?, cycle = ?, pay_day = ?, start_date = ?, notify = ?, active = ? WHERE id = ?'
        );
        stmt.run(data.name, data.amount, data.category, data.cycle, data.payDay, data.startDate, data.notify ? 1 : 0, data.active ? 1 : 0, id);
    },
    delete(id) {
        getDb().prepare('DELETE FROM subscriptions WHERE id = ?').run(id);
    },
    deleteAll() {
        getDb().prepare('DELETE FROM subscriptions').run();
    },
    bulkInsert(items) {
        const stmt = getDb().prepare(
            'INSERT OR REPLACE INTO subscriptions (id, name, amount, category, cycle, pay_day, start_date, notify, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        const insertMany = getDb().transaction((items) => {
            for (const item of items) {
                stmt.run(item.id, item.name, item.amount, item.category, item.cycle, item.payDay, item.startDate, item.notify ? 1 : 0, item.active ? 1 : 0);
            }
        });
        insertMany(items);
    }
};

// ========================================
// 目標 CRUD
// ========================================
const goalsDb = {
    getAll() {
        const rows = getDb().prepare('SELECT * FROM goals ORDER BY id DESC').all();
        return rows.map(r => ({
            ...r,
            deposits: JSON.parse(r.deposits || '[]'),
            completed: !!r.completed
        }));
    },
    create(goal) {
        const stmt = getDb().prepare(
            'INSERT INTO goals (id, name, icon, target, deadline, current, deposits, completed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        stmt.run(goal.id, goal.name, goal.icon, goal.target, goal.deadline, goal.current || 0,
            JSON.stringify(goal.deposits || []), goal.completed ? 1 : 0, goal.createdAt);
        return goal;
    },
    update(id, data) {
        const stmt = getDb().prepare(
            'UPDATE goals SET name = ?, icon = ?, target = ?, deadline = ?, current = ?, deposits = ?, completed = ? WHERE id = ?'
        );
        stmt.run(data.name, data.icon, data.target, data.deadline, data.current,
            JSON.stringify(data.deposits || []), data.completed ? 1 : 0, id);
    },
    delete(id) {
        getDb().prepare('DELETE FROM goals WHERE id = ?').run(id);
    },
    deleteAll() {
        getDb().prepare('DELETE FROM goals').run();
    },
    bulkInsert(items) {
        const stmt = getDb().prepare(
            'INSERT OR REPLACE INTO goals (id, name, icon, target, deadline, current, deposits, completed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        const insertMany = getDb().transaction((items) => {
            for (const item of items) {
                stmt.run(item.id, item.name, item.icon, item.target, item.deadline, item.current || 0,
                    JSON.stringify(item.deposits || []), item.completed ? 1 : 0, item.createdAt);
            }
        });
        insertMany(items);
    }
};

// ========================================
// 家族メンバー CRUD
// ========================================
const familyDb = {
    getAll() {
        return getDb().prepare('SELECT * FROM family_members ORDER BY id').all();
    },
    create(member) {
        const stmt = getDb().prepare(
            'INSERT INTO family_members (id, name, icon, role, created_at) VALUES (?, ?, ?, ?, ?)'
        );
        stmt.run(member.id, member.name, member.icon, member.role, member.createdAt);
        return member;
    },
    delete(id) {
        getDb().prepare('DELETE FROM family_members WHERE id = ?').run(id);
    },
    deleteAll() {
        getDb().prepare('DELETE FROM family_members').run();
    },
    bulkInsert(items) {
        const stmt = getDb().prepare(
            'INSERT OR REPLACE INTO family_members (id, name, icon, role, created_at) VALUES (?, ?, ?, ?, ?)'
        );
        const insertMany = getDb().transaction((items) => {
            for (const item of items) {
                stmt.run(item.id, item.name, item.icon, item.role, item.createdAt);
            }
        });
        insertMany(items);
    }
};

// ========================================
// ゲーミフィケーション
// ========================================
const gamificationDb = {
    get() {
        const row = getDb().prepare('SELECT * FROM gamification WHERE id = 1').get();
        if (!row) return { level: 1, exp: 0, currentStreak: 0, maxStreak: 0, lastRecordDate: null, badges: [], challenges: [] };
        return {
            level: row.level,
            exp: row.exp,
            currentStreak: row.current_streak,
            maxStreak: row.max_streak,
            lastRecordDate: row.last_record_date,
            badges: JSON.parse(row.badges || '[]'),
            challenges: JSON.parse(row.challenges || '[]')
        };
    },
    save(data) {
        const stmt = getDb().prepare(`
            INSERT OR REPLACE INTO gamification (id, level, exp, current_streak, max_streak, last_record_date, badges, challenges)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(data.level, data.exp, data.currentStreak, data.maxStreak, data.lastRecordDate,
            JSON.stringify(data.badges || []), JSON.stringify(data.challenges || []));
    }
};

// ========================================
// 連携口座
// ========================================
const linkedAccountsDb = {
    getAll() {
        const rows = getDb().prepare('SELECT * FROM linked_accounts ORDER BY id').all();
        const result = { bank: [], securities: [], credit: [], emoney: [], qr: [], points: [], ec: [] };
        for (const row of rows) {
            if (result[row.type]) {
                result[row.type].push({ name: row.name, balance: row.balance });
            }
        }
        return result;
    },
    save(accounts) {
        const deleteStmt = getDb().prepare('DELETE FROM linked_accounts');
        const insertStmt = getDb().prepare(
            'INSERT INTO linked_accounts (type, name, balance) VALUES (?, ?, ?)'
        );
        const saveAll = getDb().transaction((data) => {
            deleteStmt.run();
            for (const [type, items] of Object.entries(data)) {
                for (const item of items) {
                    insertStmt.run(type, item.name, item.balance || 0);
                }
            }
        });
        saveAll(accounts);
    }
};

// ========================================
// アカウント連携設定
// ========================================
const connectedAccountsDb = {
    getAll() {
        const rows = getDb().prepare('SELECT * FROM connected_accounts').all();
        const result = {};
        for (const row of rows) {
            result[row.service] = {
                isConnected: !!row.is_connected,
                connectedAt: row.connected_at,
                lastSync: row.last_sync,
                loginId: row.login_id,
                loginPassword: row.login_password
            };
        }
        return result;
    },
    save(configs) {
        const deleteStmt = getDb().prepare('DELETE FROM connected_accounts');
        const insertStmt = getDb().prepare(
            'INSERT INTO connected_accounts (service, is_connected, connected_at, last_sync, login_id, login_password) VALUES (?, ?, ?, ?, ?, ?)'
        );
        const saveAll = getDb().transaction((data) => {
            deleteStmt.run();
            for (const [service, config] of Object.entries(data)) {
                insertStmt.run(service, config.isConnected ? 1 : 0, config.connectedAt, config.lastSync, config.loginId, config.loginPassword);
            }
        });
        saveAll(configs);
    }
};

// ========================================
// 同期ログ
// ========================================
const syncLogsDb = {
    getAll() {
        return getDb().prepare('SELECT type, message, timestamp FROM sync_logs ORDER BY id DESC LIMIT 100').all();
    },
    save(logs) {
        const deleteStmt = getDb().prepare('DELETE FROM sync_logs');
        const insertStmt = getDb().prepare(
            'INSERT INTO sync_logs (type, message, timestamp) VALUES (?, ?, ?)'
        );
        const saveAll = getDb().transaction((items) => {
            deleteStmt.run();
            const recent = items.slice(-100);
            for (const log of recent) {
                insertStmt.run(log.type, log.message, log.timestamp);
            }
        });
        saveAll(logs);
    }
};

// ========================================
// クイック入力
// ========================================
const quickInputsDb = {
    getAll() {
        return getDb().prepare('SELECT * FROM quick_inputs ORDER BY id').all();
    },
    create(input) {
        const stmt = getDb().prepare(
            'INSERT INTO quick_inputs (id, name, amount, category, icon) VALUES (?, ?, ?, ?, ?)'
        );
        stmt.run(input.id, input.name, input.amount, input.category, input.icon);
        return input;
    },
    delete(id) {
        getDb().prepare('DELETE FROM quick_inputs WHERE id = ?').run(id);
    },
    deleteAll() {
        getDb().prepare('DELETE FROM quick_inputs').run();
    },
    bulkInsert(items) {
        const stmt = getDb().prepare(
            'INSERT OR REPLACE INTO quick_inputs (id, name, amount, category, icon) VALUES (?, ?, ?, ?, ?)'
        );
        const insertMany = getDb().transaction((items) => {
            for (const item of items) {
                stmt.run(item.id, item.name, item.amount, item.category, item.icon);
            }
        });
        insertMany(items);
    }
};

// データベースを閉じる
function closeDatabase() {
    if (db) {
        db.close();
        db = null;
    }
}

module.exports = {
    initializeDatabase,
    closeDatabase,
    getDb,
    expenses,
    incomes,
    budgets: budgetsDb,
    subscriptions: subscriptionsDb,
    goals: goalsDb,
    family: familyDb,
    gamification: gamificationDb,
    linkedAccounts: linkedAccountsDb,
    connectedAccounts: connectedAccountsDb,
    syncLogs: syncLogsDb,
    quickInputs: quickInputsDb
};
