// 家計簿アプリ - バックエンドサーバー（Supabase対応）
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

// データベース初期化
db.initializeDatabase();

// ========================================
// 認証ミドルウェア
// ========================================
async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'ログインが必要です' });
    }

    const token = authHeader.slice(7);
    const session = await db.sessions.validate(token);
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
app.post('/api/auth/register', async (req, res) => {
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

        const existing = await db.users.findByUsername(username);
        if (existing) {
            return res.status(409).json({ error: 'このユーザー名は既に使用されています' });
        }

        const user = await db.users.create(username, email, password, displayName);
        const session = await db.sessions.create(user.id);

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
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'ユーザー名とパスワードを入力してください' });
        }

        const user = await db.users.findByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
        }

        if (!db.users.verifyPassword(user, password)) {
            return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
        }

        const session = await db.sessions.create(user.id);

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
app.post('/api/auth/logout', authMiddleware, async (req, res) => {
    try {
        const token = req.headers.authorization.slice(7);
        await db.sessions.delete(token);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 現在のユーザー情報
app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const user = await db.users.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// パスワード変更
app.put('/api/auth/password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: '新しいパスワードは6文字以上にしてください' });
        }
        const user = await db.users.findByUsername(req.user.username);
        if (!db.users.verifyPassword(user, currentPassword)) {
            return res.status(401).json({ error: '現在のパスワードが正しくありません' });
        }
        await db.users.changePassword(req.user.userId, newPassword);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// プロフィール更新
app.put('/api/auth/profile', authMiddleware, async (req, res) => {
    try {
        await db.users.updateProfile(req.user.userId, req.body);
        const user = await db.users.findById(req.user.userId);
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// アカウント削除
app.delete('/api/auth/account', authMiddleware, async (req, res) => {
    try {
        await db.users.deleteUser(req.user.userId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// 支出 API
// ========================================
app.get('/api/expenses', authMiddleware, async (req, res) => {
    try { res.json(await db.expenses.getAll(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/expenses', authMiddleware, async (req, res) => {
    try { res.status(201).json(await db.expenses.create(req.user.userId, req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/expenses/:id', authMiddleware, async (req, res) => {
    try { await db.expenses.update(req.user.userId, req.params.id, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/expenses', authMiddleware, async (req, res) => {
    try {
        await db.expenses.replaceAll(req.user.userId, req.body);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/expenses/:id', authMiddleware, async (req, res) => {
    try { await db.expenses.delete(req.user.userId, req.params.id); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/expenses', authMiddleware, async (req, res) => {
    try { await db.expenses.deleteAll(req.user.userId); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/expenses/bulk', authMiddleware, async (req, res) => {
    try { await db.expenses.bulkInsert(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// 収入 API
// ========================================
app.get('/api/incomes', authMiddleware, async (req, res) => {
    try { res.json(await db.incomes.getAll(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/incomes', authMiddleware, async (req, res) => {
    try { res.status(201).json(await db.incomes.create(req.user.userId, req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/incomes', authMiddleware, async (req, res) => {
    try {
        await db.incomes.replaceAll(req.user.userId, req.body);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/incomes/:id', authMiddleware, async (req, res) => {
    try { await db.incomes.delete(req.user.userId, req.params.id); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/incomes', authMiddleware, async (req, res) => {
    try { await db.incomes.deleteAll(req.user.userId); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/incomes/bulk', authMiddleware, async (req, res) => {
    try { await db.incomes.bulkInsert(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// 予算 API
// ========================================
app.get('/api/budgets', authMiddleware, async (req, res) => {
    try { res.json(await db.budgets.getAll(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/budgets', authMiddleware, async (req, res) => {
    try { await db.budgets.replaceAll(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// 定期支出 API
// ========================================
app.get('/api/subscriptions', authMiddleware, async (req, res) => {
    try { res.json(await db.subscriptions.getAll(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/subscriptions', authMiddleware, async (req, res) => {
    try { res.status(201).json(await db.subscriptions.create(req.user.userId, req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/subscriptions', authMiddleware, async (req, res) => {
    try {
        await db.subscriptions.replaceAll(req.user.userId, req.body);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/subscriptions/:id', authMiddleware, async (req, res) => {
    try { await db.subscriptions.update(req.user.userId, req.params.id, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/subscriptions/:id', authMiddleware, async (req, res) => {
    try { await db.subscriptions.delete(req.user.userId, req.params.id); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/subscriptions', authMiddleware, async (req, res) => {
    try { await db.subscriptions.deleteAll(req.user.userId); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/subscriptions/bulk', authMiddleware, async (req, res) => {
    try { await db.subscriptions.bulkInsert(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// 目標 API
// ========================================
app.get('/api/goals', authMiddleware, async (req, res) => {
    try { res.json(await db.goals.getAll(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/goals', authMiddleware, async (req, res) => {
    try { res.status(201).json(await db.goals.create(req.user.userId, req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/goals', authMiddleware, async (req, res) => {
    try {
        await db.goals.replaceAll(req.user.userId, req.body);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/goals/:id', authMiddleware, async (req, res) => {
    try { await db.goals.update(req.user.userId, req.params.id, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/goals/:id', authMiddleware, async (req, res) => {
    try { await db.goals.delete(req.user.userId, req.params.id); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/goals', authMiddleware, async (req, res) => {
    try { await db.goals.deleteAll(req.user.userId); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/goals/bulk', authMiddleware, async (req, res) => {
    try { await db.goals.bulkInsert(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// 家族メンバー API
// ========================================
app.get('/api/family', authMiddleware, async (req, res) => {
    try { res.json(await db.familyMembers.getAll(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/family', authMiddleware, async (req, res) => {
    try { res.status(201).json(await db.familyMembers.create(req.user.userId, req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/family', authMiddleware, async (req, res) => {
    try {
        await db.familyMembers.replaceAll(req.user.userId, req.body);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/family/:id', authMiddleware, async (req, res) => {
    try { await db.familyMembers.delete(req.user.userId, req.params.id); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/family', authMiddleware, async (req, res) => {
    try { await db.familyMembers.deleteAll(req.user.userId); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/family/bulk', authMiddleware, async (req, res) => {
    try { await db.familyMembers.bulkInsert(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// ゲーミフィケーション API
// ========================================
app.get('/api/gamification', authMiddleware, async (req, res) => {
    try { res.json(await db.gamification.get(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/gamification', authMiddleware, async (req, res) => {
    try { await db.gamification.update(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// 連携口座 API
// ========================================
app.get('/api/linked-accounts', authMiddleware, async (req, res) => {
    try { res.json(await db.linkedAccounts.get(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/linked-accounts', authMiddleware, async (req, res) => {
    try { await db.linkedAccounts.update(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// 接続アカウント API
// ========================================
app.get('/api/connected-accounts', authMiddleware, async (req, res) => {
    try { res.json(await db.connectedAccounts.get(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/connected-accounts', authMiddleware, async (req, res) => {
    try { await db.connectedAccounts.update(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// 同期ログ API
// ========================================
app.get('/api/sync-logs', authMiddleware, async (req, res) => {
    try { res.json(await db.syncLogs.get(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/sync-logs', authMiddleware, async (req, res) => {
    try { await db.syncLogs.update(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// クイック入力 API
// ========================================
app.get('/api/quick-inputs', authMiddleware, async (req, res) => {
    try { res.json(await db.quickInputs.getAll(req.user.userId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/quick-inputs', authMiddleware, async (req, res) => {
    try { res.status(201).json(await db.quickInputs.create(req.user.userId, req.body)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/quick-inputs', authMiddleware, async (req, res) => {
    try {
        await db.quickInputs.replaceAll(req.user.userId, req.body);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/quick-inputs/:id', authMiddleware, async (req, res) => {
    try { await db.quickInputs.delete(req.user.userId, req.params.id); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/quick-inputs', authMiddleware, async (req, res) => {
    try { await db.quickInputs.deleteAll(req.user.userId); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/quick-inputs/bulk', authMiddleware, async (req, res) => {
    try { await db.quickInputs.bulkInsert(req.user.userId, req.body); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// 全データ取得/削除 API
// ========================================
app.get('/api/all-data', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        res.json({
            expenses: await db.expenses.getAll(userId),
            incomes: await db.incomes.getAll(userId),
            budgets: await db.budgets.getAll(userId),
            subscriptions: await db.subscriptions.getAll(userId),
            goals: await db.goals.getAll(userId),
            familyMembers: await db.familyMembers.getAll(userId),
            gamification: await db.gamification.get(userId),
            linkedAccounts: await db.linkedAccounts.get(userId),
            connectedAccounts: await db.connectedAccounts.get(userId),
            quickInputs: await db.quickInputs.getAll(userId)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/all-data', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        await db.expenses.deleteAll(userId);
        await db.incomes.deleteAll(userId);
        await db.subscriptions.deleteAll(userId);
        await db.goals.deleteAll(userId);
        await db.familyMembers.deleteAll(userId);
        await db.quickInputs.deleteAll(userId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// ページルーティング
// ========================================
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
