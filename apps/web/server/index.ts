import express from 'express';
import { toNodeHandler, fromNodeHeaders } from 'better-auth/node';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { z, ZodError } from 'zod';
import { auth, origin } from './auth.ts';
import { pool } from '../../../packages/db/client.ts';
import {
  generateWorld,
  visibleWorld,
  type World,
} from '../../../packages/game-core/src/world.ts';
import data from '../../../packages/game-data/snapshot.json';
import { WORLD_CONFIG } from '../../../packages/game-data/world-config.ts';
const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
app.all('/api/auth/*splat', toNodeHandler(auth));
app.use(express.json({ limit: '16kb' }));
app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({
    status: 'ok',
    buildVersion: '0.2.0-alpha.1',
    dataVersion: data.dataVersion,
    environment:
      process.env.NODE_ENV === 'production' ? 'production' : 'development',
  });
});
app.use('/api', async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'HEAD'].includes(req.method) && req.headers.origin !== origin) {
    res.status(403).json({ error: '请求来源不受信任，请刷新页面后重试。' });
    return;
  }
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session) {
    res.status(401).json({ error: '登录已过期，请重新登录。' });
    return;
  }
  res.locals.userId = session.user.id;
  next();
});
const saveId = z.uuid();
const saveName = z.string().trim().min(1).max(24);
app.get('/api/saves', async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT id, slot, name, created_at, last_played_at, save_version, data_version FROM game_saves WHERE user_id=$1 AND deleted_at IS NULL ORDER BY slot',
    [res.locals.userId],
  );
  res.json(rows);
});
app.post('/api/saves', async (req, res) => {
  const requestKey = z.uuid().parse(req.header('Idempotency-Key'));
  const { name } = z.object({ name: saveName }).parse(req.body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE', [
      res.locals.userId,
    ]);
    const prior = (
      await client.query(
        'SELECT id, slot, name, deleted_at FROM game_saves WHERE user_id=$1 AND creation_key=$2',
        [res.locals.userId, requestKey],
      )
    ).rows[0];
    if (prior) {
      await client.query('COMMIT');
      if (prior.deleted_at || prior.name !== name) {
        res
          .status(409)
          .json({ error: '此创建请求已使用，请重新开启一次远征。' });
        return;
      }
      res.json({ id: prior.id, slot: prior.slot, name: prior.name });
      return;
    }
    const slots = (
      await client.query(
        'SELECT slot FROM game_saves WHERE user_id=$1 AND deleted_at IS NULL',
        [res.locals.userId],
      )
    ).rows.map((r) => r.slot);
    const slot = [1, 2, 3].find((s) => !slots.includes(s));
    if (!slot) {
      await client.query('ROLLBACK');
      res.status(409).json({ error: '三个存档槽已满，请先删除一个存档。' });
      return;
    }
    const id = randomUUID();
    const seed = randomUUID();
    const world = generateWorld(seed);
    await client.query(
      'INSERT INTO game_saves(id,user_id,slot,name,world_seed,save_version,data_version,world,creation_key) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [
        id,
        res.locals.userId,
        slot,
        name,
        seed,
        '0.2.0',
        data.dataVersion,
        JSON.stringify(world),
        requestKey,
      ],
    );
    await client.query(
      'INSERT INTO account_audit(user_id, action,target_id) VALUES ($1,$2,$3)',
      [res.locals.userId, 'save.create', id],
    );
    await client.query('COMMIT');
    res.status(201).json({ id, slot, name });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});
app.get('/api/saves/:id/world', async (req, res) => {
  const id = saveId.parse(req.params.id);
  const { rows } = await pool.query(
    'UPDATE game_saves SET last_played_at=now() WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL RETURNING world, name, world_seed, save_version, data_version',
    [id, res.locals.userId],
  );
  if (!rows[0]) {
    res.status(404).json({ error: '存档不存在或不属于当前账户。' });
    return;
  }
  const row = rows[0];
  const world = row.world as World;
  if (
    row.save_version !== '0.2.0' ||
    row.data_version !== data.dataVersion ||
    world.generatorVersion !== WORLD_CONFIG.generatorVersion
  ) {
    res
      .status(409)
      .json({ error: '此存档版本需要迁移，请保留存档并更新应用。' });
    return;
  }
  res.json({
    ...visibleWorld(world),
    save: {
      id,
      name: row.name,
      seed: row.world_seed,
      saveVersion: row.save_version,
      dataVersion: row.data_version,
    },
    player: {
      level: 1,
      xp: 0,
      nextXP: data.levels[0].nextXP,
      credits: WORLD_CONFIG.start.credits,
      planetCap: data.levels[0].planetCap,
      shipCap: data.levels[0].shipCap,
    },
    ships: ['侦察', '战斗'].map((role) =>
      data.ships.find(
        (s) => s.size === '小型' && s.role === role && s.grade === 'E',
      ),
    ),
  });
});
app.delete('/api/saves/:id', async (req, res) => {
  const id = saveId.parse(req.params.id);
  const { name } = z.object({ name: saveName }).parse(req.body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'UPDATE game_saves SET deleted_at=now() WHERE id=$1 AND user_id=$2 AND name=$3 AND deleted_at IS NULL RETURNING id',
      [id, res.locals.userId, name],
    );
    if (!rows[0]) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: '存档名称不匹配，或存档不存在。' });
      return;
    }
    await client.query(
      'INSERT INTO account_audit(user_id, action,target_id) VALUES ($1,$2,$3)',
      [res.locals.userId, 'save.delete', id],
    );
    await client.query('COMMIT');
    res.status(204).end();
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});
app.get('/api/audit', async (_req, res) => {
  res.json(
    (
      await pool.query(
        'SELECT action, created_at FROM account_audit WHERE user_id=$1 ORDER BY id DESC LIMIT 20',
        [res.locals.userId],
      )
    ).rows,
  );
});
app.use('/api', (_req, res) => {
  res.status(404).json({ error: '接口不存在。' });
});
app.use(express.static(resolve('dist')));
app.get('/*splat', (_req, res) => {
  res.sendFile(resolve('dist/index.html'));
});
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof ZodError) {
      res.status(400).json({ error: '输入格式不正确，请检查名称或存档标识。' });
      return;
    }
    // Never log request bodies, session tokens, passwords or database connection strings.
    console.error(
      'API request failed',
      error instanceof Error ? error.name : 'UnknownError',
    );
    res.status(500).json({ error: '服务暂时不可用，请稍后重试。' });
  },
);
const server = app.listen(Number(process.env.PORT || 3001), '0.0.0.0', () =>
  console.log('Colony API ready'),
);
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  });
