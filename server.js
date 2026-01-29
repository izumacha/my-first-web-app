// 家計簿アプリ - バックエンドサーバー（認証対応・Vercel対応）
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// データベース初期化（非同期）
let dbInitialized = false;
const initPromise = db.initializeDatabase().then(() => {
    dbInitialized = true;
}).catch(err => {
    console.error('データベース初期化エラー:', err);
});

// DB初期化待機ミドルウェア
app.use(async (req, res, next) => {
    if (!dbInitialized) await initPromise;
    next();
});

// ========================================
// 認証ミドルウェア
// ========================================
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'ログインが必要です' });
    }

    const token = authHeader.slice(7);
    const session = db.sessions.validate(token);
    if (!session) {
        return res.status(401).json({ error: 'セッションが無効または期限切れです' });
    }

    req.user = session;
    next();
}

// ========================================
// 認証 API
// ========================================

// ユーザー登録
app.post('/api/auth/register', (req, res) => {
    try {
        const { username, email, password, displayName } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'ユーザー名とパスワードは必須です' });
        }
        if (username.length < 3) {
            return res.status(400).json({ error: 'ユーザー名は3文字以上にしてください' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'パスワードは6文字以上にしてください' });
        }

        const existing = db.users.findByUsername(username);
        if (existing) {
            return res.status(409).json({ error: 'このユーザー名は既に使用されています' });
        }

        const user = db.users.create(username, email, password, displayName);
        const session = db.sessions.create(user.id);

        res.status(201).json({
            user: { id: user.id, username: user.username, email: user.email, displayName: user.displayName },
            token: session.token,
            expiresAt: session.expiresAt
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ログイン
app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'ユーザー名とパスワードを入力してください' });
        }

        const user = db.users.findByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
        }

        if (!db.users.verifyPassword(user, password)) {
            return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
        }

        const session = db.sessions.create(user.id);

        res.json({
            user: { id: user.id, username: user.username, email: user.email, displayName: user.display_name },
            token: session.token,
            expiresAt: session.expiresAt
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ログアウト
app.post('/api/auth/logout', authMiddleware, (req, res) => {
    try {
        const token = req.headers.authorization.slice(7);
        db.sessions.delete(token);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 現在のユーザー情報
app.get('/api/auth/me', authMiddleware, (req, res) => {
    try {
        const user = db.users.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// パスワード変更
app.put('/api/auth/password', authMiddleware, (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: '新しいパスワードは6文字以上にしてください' });
        }
        const user = db.users.findByUsername(req.user.username);
        if (!db.users.verifyPassword(user, currentPassword)) {
            return res.status(401).json({ error: '現在のパスワードが正しくありません' });
        }
        db.users.changePassword(req.user.userId, newPassword);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// プロフィール更新
app.put('/api/auth/profile', authMiddleware, (req, res) => {
    try {
        db.users.updateProfile(req.user.userId, req.body);
        const user = db.users.findById(req.user.userId);
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// アカウント削除
app.delete('/api/auth/account', authMiddleware, (req, res) => {
    try {
        db.users.deleteUser(req.user.userId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// 以下、すべて認証必須
// ========================================

// 支出 API
app.get('/api/expenses', authMiddleware, (req, res) => {
    try { res.json(db.expenses.getAll(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/expenses', authMiddleware, (req, res) => {
    try { res.status(201).json(db.expenses.create(req.user.userId, req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/expenses/:id', authMiddleware, (req, res) => {
    try { res.json(db.expenses.update(req.user.userId, parseInt(req.params.id), req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/expenses', authMiddleware, (req, res) => {
    try {
        db.expenses.deleteAll(req.user.userId);
        if (Array.isArray(req.body) && req.body.length > 0) db.expenses.bulkInsert(req.user.userId, req.body);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/expenses/:id', authMiddleware, (req, res) => {
    try { db.expenses.delete(req.user.userId, parseInt(req.params.id)); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/expenses', authMiddleware, (req, res) => {
    try { db.expenses.deleteAll(req.user.userId); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/expenses/bulk', authMiddleware, (req, res) => {
    try { db.expenses.bulkInsert(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// 収入 API
app.get('/api/incomes', authMiddleware, (req, res) => {
    try { res.json(db.incomes.getAll(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/incomes', authMiddleware, (req, res) => {
    try { res.status(201).json(db.incomes.create(req.user.userId, req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/incomes', authMiddleware, (req, res) => {
    try {
        db.incomes.deleteAll(req.user.userId);
        if (Array.isArray(req.body) && req.body.length > 0) db.incomes.bulkInsert(req.user.userId, req.body);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/incomes/:id', authMiddleware, (req, res) => {
    try { db.incomes.delete(req.user.userId, parseInt(req.params.id)); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/incomes', authMiddleware, (req, res) => {
    try { db.incomes.deleteAll(req.user.userId); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/incomes/bulk', authMiddleware, (req, res) => {
    try { db.incomes.bulkInsert(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// 予算 API
app.get('/api/budgets', authMiddleware, (req, res) => {
    try { res.json(db.budgets.getAll(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/budgets', authMiddleware, (req, res) => {
    try { db.budgets.save(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/budgets', authMiddleware, (req, res) => {
    try { db.budgets.deleteAll(req.user.userId); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// 定期支出 API
app.get('/api/subscriptions', authMiddleware, (req, res) => {
    try { res.json(db.subscriptions.getAll(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/subscriptions', authMiddleware, (req, res) => {
    try { res.status(201).json(db.subscriptions.create(req.user.userId, req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/subscriptions', authMiddleware, (req, res) => {
    try {
        db.subscriptions.deleteAll(req.user.userId);
        if (Array.isArray(req.body) && req.body.length > 0) db.subscriptions.bulkInsert(req.user.userId, req.body);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/subscriptions/:id', authMiddleware, (req, res) => {
    try { db.subscriptions.update(req.user.userId, parseInt(req.params.id), req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/subscriptions/:id', authMiddleware, (req, res) => {
    try { db.subscriptions.delete(req.user.userId, parseInt(req.params.id)); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/subscriptions', authMiddleware, (req, res) => {
    try { db.subscriptions.deleteAll(req.user.userId); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/subscriptions/bulk', authMiddleware, (req, res) => {
    try { db.subscriptions.bulkInsert(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// 目標 API
app.get('/api/goals', authMiddleware, (req, res) => {
    try { res.json(db.goals.getAll(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/goals', authMiddleware, (req, res) => {
    try { res.status(201).json(db.goals.create(req.user.userId, req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/goals', authMiddleware, (req, res) => {
    try {
        db.goals.deleteAll(req.user.userId);
        if (Array.isArray(req.body) && req.body.length > 0) db.goals.bulkInsert(req.user.userId, req.body);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/goals/:id', authMiddleware, (req, res) => {
    try { db.goals.update(req.user.userId, parseInt(req.params.id), req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/goals/:id', authMiddleware, (req, res) => {
    try { db.goals.delete(req.user.userId, parseInt(req.params.id)); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/goals', authMiddleware, (req, res) => {
    try { db.goals.deleteAll(req.user.userId); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/goals/bulk', authMiddleware, (req, res) => {
    try { db.goals.bulkInsert(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// 家族メンバー API
app.get('/api/family', authMiddleware, (req, res) => {
    try { res.json(db.family.getAll(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/family', authMiddleware, (req, res) => {
    try { res.status(201).json(db.family.create(req.user.userId, req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/family', authMiddleware, (req, res) => {
    try {
        db.family.deleteAll(req.user.userId);
        if (Array.isArray(req.body) && req.body.length > 0) db.family.bulkInsert(req.user.userId, req.body);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/family/:id', authMiddleware, (req, res) => {
    try { db.family.delete(req.user.userId, parseInt(req.params.id)); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/family', authMiddleware, (req, res) => {
    try { db.family.deleteAll(req.user.userId); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/family/bulk', authMiddleware, (req, res) => {
    try { db.family.bulkInsert(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ゲーミフィケーション API
app.get('/api/gamification', authMiddleware, (req, res) => {
    try { res.json(db.gamification.get(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/gamification', authMiddleware, (req, res) => {
    try { db.gamification.save(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// 連携口座 API
app.get('/api/linked-accounts', authMiddleware, (req, res) => {
    try { res.json(db.linkedAccounts.getAll(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/linked-accounts', authMiddleware, (req, res) => {
    try { db.linkedAccounts.save(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// アカウント連携 API
app.get('/api/connected-accounts', authMiddleware, (req, res) => {
    try { res.json(db.connectedAccounts.getAll(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/connected-accounts', authMiddleware, (req, res) => {
    try { db.connectedAccounts.save(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// 同期ログ API
app.get('/api/sync-logs', authMiddleware, (req, res) => {
    try { res.json(db.syncLogs.getAll(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/sync-logs', authMiddleware, (req, res) => {
    try { db.syncLogs.save(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// クイック入力 API
app.get('/api/quick-inputs', authMiddleware, (req, res) => {
    try { res.json(db.quickInputs.getAll(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/quick-inputs', authMiddleware, (req, res) => {
    try { res.status(201).json(db.quickInputs.create(req.user.userId, req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/quick-inputs', authMiddleware, (req, res) => {
    try {
        db.quickInputs.deleteAll(req.user.userId);
        if (Array.isArray(req.body) && req.body.length > 0) db.quickInputs.bulkInsert(req.user.userId, req.body);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/quick-inputs/:id', authMiddleware, (req, res) => {
    try { db.quickInputs.delete(req.user.userId, parseInt(req.params.id)); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/quick-inputs', authMiddleware, (req, res) => {
    try { db.quickInputs.deleteAll(req.user.userId); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/quick-inputs/bulk', authMiddleware, (req, res) => {
    try { db.quickInputs.bulkInsert(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// 全データ取得
app.get('/api/all-data', authMiddleware, (req, res) => {
    try {
        const uid = req.user.userId;
        res.json({
            expenses: db.expenses.getAll(uid), incomes: db.incomes.getAll(uid),
            budgets: db.budgets.getAll(uid), subscriptions: db.subscriptions.getAll(uid),
            goals: db.goals.getAll(uid), familyMembers: db.family.getAll(uid),
            gamification: db.gamification.get(uid), linkedAccounts: db.linkedAccounts.getAll(uid),
            connectedAccounts: db.connectedAccounts.getAll(uid), syncLogs: db.syncLogs.getAll(uid),
            quickInputs: db.quickInputs.getAll(uid)
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 全データ削除
app.delete('/api/all-data', authMiddleware, (req, res) => {
    try {
        const uid = req.user.userId;
        db.expenses.deleteAll(uid); db.incomes.deleteAll(uid); db.budgets.deleteAll(uid);
        db.subscriptions.deleteAll(uid); db.goals.deleteAll(uid); db.family.deleteAll(uid);
        db.gamification.save(uid, { level: 1, exp: 0, currentStreak: 0, maxStreak: 0, lastRecordDate: null, badges: [], challenges: [] });
        db.linkedAccounts.save(uid, { bank: [], securities: [], credit: [], emoney: [], qr: [], points: [], ec: [] });
        db.connectedAccounts.save(uid, {}); db.syncLogs.save(uid, []); db.quickInputs.deleteAll(uid);
        res.json({ success: true, message: '全データを削除しました' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ページルーティング
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// サーバー起動
const server = app.listen(PORT, () => {
    console.log(`家計簿アプリサーバーが起動しました: http://localhost:${PORT}`);
});

process.on('SIGINT', () => { db.closeDatabase(); server.close(); process.exit(0); });
process.on('SIGTERM', () => { db.closeDatabase(); server.close(); process.exit(0); });

module.exports = app;
