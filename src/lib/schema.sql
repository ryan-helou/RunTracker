-- RunTracker schema. Idempotent: safe to run repeatedly.

-- Name-only accounts: a username is the whole identity (no password).
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username      TEXT NOT NULL,
  username_lower TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS runs (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_key     TEXT NOT NULL,
  category_key TEXT NOT NULL,
  total_ms     INTEGER,                              -- final cumulative time; NULL if abandoned
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  splits       JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{ name, cumulativeMs, segmentMs, skipped }]
  note         TEXT NOT NULL DEFAULT '',
  name         TEXT NOT NULL DEFAULT '',
  mode         TEXT NOT NULL DEFAULT 'solo',          -- 'solo' | 'coop'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add new columns to pre-existing databases (no-op if already present).
ALTER TABLE runs ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE runs ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'solo';

CREATE INDEX IF NOT EXISTS runs_user_cat_idx
  ON runs (user_id, game_key, category_key);

CREATE INDEX IF NOT EXISTS runs_user_created_idx
  ON runs (user_id, created_at DESC);
