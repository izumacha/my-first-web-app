-- シンプル家計簿テーブル
CREATE TABLE IF NOT EXISTS expenses (
    id BIGSERIAL PRIMARY KEY,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    amount INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS無効（シンプル版）
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
