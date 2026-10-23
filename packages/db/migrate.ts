import { readFile, readdir } from 'node:fs/promises';
import { pool } from './client.ts';
import type { Pool } from 'pg';
export async function migrate(dbPool: Pool = pool) {
  const client = await dbPool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(708210)');
    await client.query(
      'CREATE TABLE IF NOT EXISTS migration_history (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())',
    );
    for (const name of (
      await readdir(new URL('./migrations/', import.meta.url))
    )
      .filter((n) => n.endsWith('.sql'))
      .sort()) {
      if (
        (
          await client.query('SELECT 1 FROM migration_history WHERE name=$1', [
            name,
          ])
        ).rowCount
      )
        continue;
      await client.query('BEGIN');
      try {
        await client.query(
          await readFile(
            new URL(`./migrations/${name}`, import.meta.url),
            'utf8',
          ),
        );
        await client.query('INSERT INTO migration_history(name) VALUES ($1)', [
          name,
        ]);
        await client.query('COMMIT');
        console.log(`Applied ${name}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(708210)');
    client.release();
  }
}
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  await migrate();
  await pool.end();
}
