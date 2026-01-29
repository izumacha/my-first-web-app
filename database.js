// データベース管理モジュール（sql.js版 - Vercel対応）
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const SALT_ROUNDS = 10;
const SESSION_EXPIRY_DAYS = 30;

let db = null;
let dbReady = null;

// データベース初期化（非同期）
async function initDb() {
    if (db) return db;
    const SQL = await initSqlJs();
    db = new SQL.Database();
    return db;
}

// 初期化Promise
function getDbReady() {
    if (!dbReady) {
        dbReady = initDb();
    }
    return dbReady;
}

// 同期的にDBを取得（初期化済み前提）
function getDb() {
    if (!db) throw new Error('Database not initialized');
    return db;
}

// ========================================
// テーブル作成
// ========================================
async function initializeDatabase() {
    await getDbReady();

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            display_name TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            updated_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY,
            user_id TEXT NOT NULL,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            amount INTEGER NOT NULL,
            category TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS incomes (
            id INTEGER PRIMARY KEY,
            user_id TEXT NOT NULL,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            amount INTEGER NOT NULL,
            category TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY,
            user_id TEXT NOT NULL,
            month TEXT NOT NULL,
            category TEXT NOT NULL,
            amount INTEGER NOT NULL,
            UNIQUE(user_id, month, category),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    db.run(`
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
        )
    `);

    db.run(`
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
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS family_members (
            id INTEGER PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            icon TEXT DEFAULT '👤',
            role TEXT DEFAULT 'member',
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    db.run(`
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
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS linked_accounts (
            id INTEGER PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            balance REAL DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    db.run(`
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
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS sync_logs (
            id INTEGER PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS quick_inputs (
            id INTEGER PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            amount INTEGER NOT NULL,
            category TEXT NOT NULL,
            icon TEXT DEFAULT '⚡',
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    console.log('データベースを初期化しました（メモリ内）');
    return db;
}

// ヘルパー関数
function queryAll(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

function queryOne(sql, params = []) {
    const results = queryAll(sql, params);
    return results.length > 0 ? results[0] : null;
}

function runSql(sql, params = []) {
    db.run(sql, params);
    return { changes: db.getRowsModified() };
}

// ========================================
// ユーザー管理
// ========================================
const usersDb = {
    create(username, email, password, displayName) {
        const id = uuidv4();
        const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        runSql(
            'INSERT INTO users (id, username, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, username, email || null, passwordHash, displayName || username, now, now]
        );
        runSql(
            'INSERT INTO gamification (user_id, level, exp, current_streak, max_streak, badges, challenges) VALUES (?, 1, 0, 0, 0, \'[]\', \'[]\')',
            [id]
        );
        return { id, username, email, displayName: displayName || username };
    },

    findByUsername(username) {
        return queryOne('SELECT * FROM users WHERE username = ?', [username]);
    },

    findById(id) {
        const row = queryOne('SELECT id, username, email, display_name, created_at FROM users WHERE id = ?', [id]);
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
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        fields.push('updated_at = ?');
        values.push(now);
        values.push(id);
        runSql(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    },

    changePassword(id, newPassword) {
        const passwordHash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        runSql('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [passwordHash, now, id]);
    },

    deleteUser(id) {
        runSql('DELETE FROM users WHERE id = ?', [id]);
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
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        runSql('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)', [token, userId, now, expiresStr]);
        return { token, expiresAt: expiresStr };
    },

    validate(token) {
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const session = queryOne(
            'SELECT s.*, u.id as uid, u.username, u.email, u.display_name FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > ?',
            [token, now]
        );
        if (!session) return null;
        return {
            userId: session.user_id,
            username: session.username,
            email: session.email,
            displayName: session.display_name
        };
    },

    delete(token) {
        runSql('DELETE FROM sessions WHERE token = ?', [token]);
    },

    deleteAllForUser(userId) {
        runSql('DELETE FROM sessions WHERE user_id = ?', [userId]);
    },

    cleanup() {
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        runSql('DELETE FROM sessions WHERE expires_at < ?', [now]);
    }
};

// ========================================
// 汎用CRUD（ユーザー別）
// ========================================
function createCRUD(tableName, idField = 'id') {
    return {
        getAll(userId) {
            return queryAll(`SELECT * FROM ${tableName} WHERE user_id = ? ORDER BY ${idField} DESC`, [userId]);
        },
        create(userId, data) {
            const keys = Object.keys(data);
            const vals = Object.values(data);
            runSql(
                `INSERT INTO ${tableName} (user_id, ${keys.join(', ')}) VALUES (?, ${keys.map(() => '?').join(', ')})`,
                [userId, ...vals]
            );
            return data;
        },
        update(userId, id, data) {
            const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
            const vals = [...Object.values(data), id, userId];
            runSql(`UPDATE ${tableName} SET ${sets} WHERE ${idField} = ? AND user_id = ?`, vals);
        },
        delete(userId, id) {
            runSql(`DELETE FROM ${tableName} WHERE ${idField} = ? AND user_id = ?`, [id, userId]);
        },
        deleteAll(userId) {
            runSql(`DELETE FROM ${tableName} WHERE user_id = ?`, [userId]);
        },
        bulkInsert(userId, items) {
            items.forEach(item => {
                const keys = Object.keys(item);
                const vals = Object.values(item);
                runSql(
                    `INSERT INTO ${tableName} (user_id, ${keys.join(', ')}) VALUES (?, ${keys.map(() => '?').join(', ')})`,
                    [userId, ...vals]
                );
            });
        },
        replaceAll(userId, items) {
            runSql(`DELETE FROM ${tableName} WHERE user_id = ?`, [userId]);
            if (Array.isArray(items)) {
                items.forEach(item => {
                    const keys = Object.keys(item);
                    const vals = Object.values(item);
                    runSql(
                        `INSERT INTO ${tableName} (user_id, ${keys.join(', ')}) VALUES (?, ${keys.map(() => '?').join(', ')})`,
                        [userId, ...vals]
                    );
                });
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
    getAll(userId) {
        const rows = queryAll('SELECT month, category, amount FROM budgets WHERE user_id = ?', [userId]);
        const result = {};
        rows.forEach(r => {
            if (!result[r.month]) result[r.month] = {};
            result[r.month][r.category] = r.amount;
        });
        return result;
    },
    replaceAll(userId, data) {
        runSql('DELETE FROM budgets WHERE user_id = ?', [userId]);
        for (const [month, cats] of Object.entries(data)) {
            for (const [category, amount] of Object.entries(cats)) {
                runSql('INSERT INTO budgets (user_id, month, category, amount) VALUES (?, ?, ?, ?)', [userId, month, category, amount]);
            }
        }
    }
};

// ゲーミフィケーション
const gamification = {
    get(userId) {
        const row = queryOne('SELECT * FROM gamification WHERE user_id = ?', [userId]);
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
    update(userId, data) {
        const existing = queryOne('SELECT user_id FROM gamification WHERE user_id = ?', [userId]);
        const badges = JSON.stringify(data.badges || []);
        const challenges = JSON.stringify(data.challenges || []);
        if (existing) {
            runSql(
                'UPDATE gamification SET level = ?, exp = ?, current_streak = ?, max_streak = ?, last_record_date = ?, badges = ?, challenges = ? WHERE user_id = ?',
                [data.level || 1, data.exp || 0, data.currentStreak || 0, data.maxStreak || 0, data.lastRecordDate || null, badges, challenges, userId]
            );
        } else {
            runSql(
                'INSERT INTO gamification (user_id, level, exp, current_streak, max_streak, last_record_date, badges, challenges) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [userId, data.level || 1, data.exp || 0, data.currentStreak || 0, data.maxStreak || 0, data.lastRecordDate || null, badges, challenges]
            );
        }
    }
};

// 連携口座（JSON形式）
const linkedAccounts = {
    get(userId) {
        const rows = queryAll('SELECT type, name, balance FROM linked_accounts WHERE user_id = ?', [userId]);
        const result = { bank: [], securities: [], credit: [], emoney: [], qr: [], points: [], ec: [] };
        rows.forEach(r => {
            if (result[r.type]) result[r.type].push({ name: r.name, balance: r.balance });
        });
        return result;
    },
    update(userId, data) {
        runSql('DELETE FROM linked_accounts WHERE user_id = ?', [userId]);
        for (const [type, accounts] of Object.entries(data)) {
            if (Array.isArray(accounts)) {
                accounts.forEach(acc => {
                    runSql('INSERT INTO linked_accounts (user_id, type, name, balance) VALUES (?, ?, ?, ?)', [userId, type, acc.name, acc.balance || 0]);
                });
            }
        }
    }
};

// 接続アカウント
const connectedAccounts = {
    get(userId) {
        const rows = queryAll('SELECT service, is_connected, connected_at, last_sync, login_id FROM connected_accounts WHERE user_id = ?', [userId]);
        const result = {};
        rows.forEach(r => {
            result[r.service] = { isConnected: !!r.is_connected, connectedAt: r.connected_at, lastSync: r.last_sync, loginId: r.login_id };
        });
        return result;
    },
    update(userId, data) {
        runSql('DELETE FROM connected_accounts WHERE user_id = ?', [userId]);
        for (const [service, info] of Object.entries(data)) {
            runSql(
                'INSERT INTO connected_accounts (user_id, service, is_connected, connected_at, last_sync, login_id, login_password) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, service, info.isConnected ? 1 : 0, info.connectedAt || null, info.lastSync || null, info.loginId || null, info.loginPassword || null]
            );
        }
    }
};

// 同期ログ
const syncLogs = {
    get(userId) {
        return queryAll('SELECT type, message, timestamp FROM sync_logs WHERE user_id = ? ORDER BY id DESC LIMIT 100', [userId]);
    },
    add(userId, type, message) {
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        runSql('INSERT INTO sync_logs (user_id, type, message, timestamp) VALUES (?, ?, ?, ?)', [userId, type, message, now]);
    },
    clear(userId) {
        runSql('DELETE FROM sync_logs WHERE user_id = ?', [userId]);
    },
    update(userId, logs) {
        runSql('DELETE FROM sync_logs WHERE user_id = ?', [userId]);
        logs.forEach(log => {
            runSql('INSERT INTO sync_logs (user_id, type, message, timestamp) VALUES (?, ?, ?, ?)', [userId, log.type, log.message, log.timestamp]);
        });
    }
};

function closeDatabase() {
    if (db) {
        db.close();
        db = null;
        dbReady = null;
    }
}

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
