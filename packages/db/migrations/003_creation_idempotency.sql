ALTER TABLE game_saves ADD COLUMN creation_key UUID;
UPDATE game_saves SET creation_key=id;
ALTER TABLE game_saves ALTER COLUMN creation_key SET NOT NULL;
ALTER TABLE game_saves ALTER COLUMN creation_key SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX game_saves_creation_key ON game_saves(user_id, creation_key);
