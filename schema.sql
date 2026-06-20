-- SecTrainer database schema
-- Run this once against your PostgreSQL database before starting the server.
-- (npm run migrate does this automatically using this file.)

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(40) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS progress (
  user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data            JSONB NOT NULL DEFAULT '{}'::jsonb,   -- full client-side progress object (cats, missed, sessionHistory, etc.)
  total_attempted INTEGER NOT NULL DEFAULT 0,
  total_correct   INTEGER NOT NULL DEFAULT 0,
  best_streak     INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Speeds up leaderboard sorting
CREATE INDEX IF NOT EXISTS idx_progress_accuracy
  ON progress (total_correct, total_attempted)
  WHERE total_attempted >= 10;

-- Rate-limit tracking for the AI explain proxy (basic abuse protection)
CREATE TABLE IF NOT EXISTS ai_requests (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_requests_user_time ON ai_requests (user_id, created_at);
