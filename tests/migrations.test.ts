import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { pool } from '../packages/db/client';
import { migrate } from '../packages/db/migrate';
import { generateWorld } from '../packages/game-core/src/world';
test('fresh migrations, previous fixture upgrade, constraints and repeatability on real PostgreSQL', async () => {
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  await pool.query(`CREATE SCHEMA ${schema}`);
  const scoped = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${schema}`,
  });
  try {
    // Simulate the previous auth-only milestone, then upgrade via the actual runner.
    await scoped.query(
      await readFile(
        new URL('../packages/db/migrations/001_auth.sql', import.meta.url),
        'utf8',
      ),
    );
    await scoped.query(
      'CREATE TABLE migration_history(name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())',
    );
    await scoped.query(
      "INSERT INTO migration_history(name) VALUES ('001_auth.sql')",
    );
    await scoped.query(
      'INSERT INTO "user"(id,name,email,"emailVerified") VALUES ($1,$2,$3,false)',
      ['previous-owner', '之前的指挥官', 'migration@test.invalid'],
    );
    await migrate(scoped);
    const id = randomUUID();
    const world = generateWorld('migration-world');
    await scoped.query(
      'INSERT INTO game_saves(id,user_id,slot,name,world_seed,save_version,data_version,world) VALUES ($1,$2,1,$3,$4,$5,$6,$7)',
      [
        id,
        'previous-owner',
        '保留存档',
        'migration-world',
        '0.2.0',
        'data-1.0.0-import.1',
        world,
      ],
    );
    await migrate(scoped);
    assert.equal(
      (await scoped.query('SELECT count(*)::int AS n FROM migration_history'))
        .rows[0].n,
      3,
    );
    assert.deepEqual(
      (await scoped.query('SELECT world FROM game_saves WHERE id=$1', [id]))
        .rows[0].world,
      world,
    );
    assert.equal(
      (
        await scoped.query('SELECT name FROM "user" WHERE id=$1', [
          'previous-owner',
        ])
      ).rows[0].name,
      '之前的指挥官',
    );
    await assert.rejects(
      scoped.query(
        'INSERT INTO game_saves(id,user_id,slot,name,world_seed,save_version,data_version,world,created_at,last_played_at,deleted_at) SELECT $1,user_id,slot,name,world_seed,save_version,data_version,world,created_at,last_played_at,deleted_at FROM game_saves WHERE id=$2',
        [randomUUID(), id],
      ),
      { code: '23505' },
    );
    await scoped.query('DELETE FROM "user" WHERE id=$1', ['previous-owner']);
    assert.equal(
      (await scoped.query('SELECT count(*)::int AS n FROM game_saves')).rows[0]
        .n,
      0,
    );
    // The runner also supports a completely empty database schema.
    await scoped.query(
      'DROP TABLE migration_history, account_audit, game_saves, verification, account, session, "user" CASCADE',
    );
    await migrate(scoped);
    assert.equal(
      (await scoped.query('SELECT count(*)::int AS n FROM migration_history'))
        .rows[0].n,
      3,
    );
  } finally {
    await scoped.end();
    await pool.query(`DROP SCHEMA ${schema} CASCADE`);
    await pool.end();
  }
});
