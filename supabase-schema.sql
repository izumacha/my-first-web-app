-- Supabase テーブル作成スクリプト
-- Supabase ダッシュボードの SQL Editor でこのスクリプトを実行してください

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- セッションテーブル
CREATE TABLE IF NOT EXISTS sessions (
    token UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- 支出テーブル
CREATE TABLE IF NOT EXISTS expenses (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    amount INTEGER NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 収入テーブル
CREATE TABLE IF NOT EXISTS incomes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    amount INTEGER NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 予算テーブル
CREATE TABLE IF NOT EXISTS budgets (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    category TEXT NOT NULL,
    amount INTEGER NOT NULL,
    UNIQUE(user_id, month, category)
);

-- 定期支出テーブル
CREATE TABLE IF NOT EXISTS subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    category TEXT NOT NULL,
    cycle TEXT NOT NULL DEFAULT 'monthly',
    pay_day INTEGER DEFAULT 1,
    start_date TEXT,
    notify BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 目標テーブル
CREATE TABLE IF NOT EXISTS goals (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '🎯',
    target INTEGER NOT NULL,
    deadline TEXT,
    current INTEGER DEFAULT 0,
    deposits JSONB DEFAULT '[]',
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 家族メンバーテーブル
CREATE TABLE IF NOT EXISTS family_members (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '👤',
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ゲーミフィケーションテーブル
CREATE TABLE IF NOT EXISTS gamification (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    exp INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    last_record_date TEXT,
    badges JSONB DEFAULT '[]',
    challenges JSONB DEFAULT '[]'
);

-- 連携口座テーブル
CREATE TABLE IF NOT EXISTS linked_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    balance REAL DEFAULT 0
);

-- 接続アカウントテーブル
CREATE TABLE IF NOT EXISTS connected_accounts (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service TEXT NOT NULL,
    is_connected BOOLEAN DEFAULT FALSE,
    connected_at TIMESTAMPTZ,
    last_sync TIMESTAMPTZ,
    login_id TEXT,
    login_password TEXT,
    PRIMARY KEY (user_id, service)
);

-- 同期ログテーブル
CREATE TABLE IF NOT EXISTS sync_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- クイック入力テーブル
CREATE TABLE IF NOT EXISTS quick_inputs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    category TEXT NOT NULL,
    icon TEXT DEFAULT '⚡'
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_user ON incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Row Level Security (RLS) を有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE linked_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_inputs ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー（サーバーサイドからのアクセスを許可）
-- service_role キーを使用するため、すべてのアクセスを許可
CREATE POLICY "Allow all for service role" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON expenses FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON incomes FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON budgets FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON subscriptions FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON goals FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON family_members FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON gamification FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON linked_accounts FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON connected_accounts FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON sync_logs FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON quick_inputs FOR ALL USING (true);
