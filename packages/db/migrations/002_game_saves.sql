CREATE TABLE game_saves (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  slot SMALLINT NOT NULL CHECK (slot BETWEEN 1 AND 3),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 24),
  world_seed TEXT NOT NULL,
  save_version TEXT NOT NULL,
  data_version TEXT NOT NULL,
  world JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX game_saves_active_slot ON game_saves(user_id, slot) WHERE deleted_at IS NULL;
CREATE TABLE account_audit (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
