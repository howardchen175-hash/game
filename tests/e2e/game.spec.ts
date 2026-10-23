import {
  test,
  expect,
  request as requestFactory,
  type APIRequestContext,
} from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { pool } from '../../packages/db/client';
const users: string[] = [];
const origin = 'http://localhost:5173';
async function register(context: APIRequestContext) {
  const email = `${randomUUID()}@test.invalid`;
  const password = `${randomUUID()}Aa1`;
  const res = await context.post('/api/auth/sign-up/email', {
    data: { email, password, name: '测试指挥官' },
    headers: { Origin: origin },
  });
  expect(res.status()).toBe(200);
  const result = await res.json();
  users.push(result.user.id);
  return { email, password };
}
test.afterAll(async () => {
  for (const id of users)
    await pool.query('DELETE FROM "user" WHERE id=$1', [id]);
  await pool.end();
});
test('account ownership, concurrent three-slot limit, CSRF, deletion and session revocation', async () => {
  const a = await requestFactory.newContext({ baseURL: origin });
  const b = await requestFactory.newContext({ baseURL: origin });
  expect((await a.get('/api/saves')).status()).toBe(401);
  const credentials = await register(a);
  await register(b);
  const requestKeys = [1, 2, 3, 4].map(() => randomUUID());
  const responses = await Promise.all(
    [1, 2, 3, 4].map((n) =>
      a.post('/api/saves', {
        data: { name: `宇宙 ${n}` },
        headers: { Origin: origin, 'Idempotency-Key': requestKeys[n - 1] },
      }),
    ),
  );
  expect(responses.filter((r) => r.status() === 201)).toHaveLength(3);
  expect(responses.filter((r) => r.status() === 409)).toHaveLength(1);
  const firstSuccess = responses.findIndex((r) => r.status() === 201);
  const replay = await a.post('/api/saves', {
    data: { name: `宇宙 ${firstSuccess + 1}` },
    headers: { Origin: origin, 'Idempotency-Key': requestKeys[firstSuccess] },
  });
  expect(replay.status()).toBe(200);
  expect(await replay.json()).toEqual(await responses[firstSuccess].json());
  const saves = await (await a.get('/api/saves')).json();
  const id = saves[0].id;
  expect(await (await b.get('/api/saves')).json()).toHaveLength(0);
  expect((await b.get(`/api/saves/${id}/world`)).status()).toBe(404);
  expect(
    (
      await b.delete(`/api/saves/${id}`, {
        data: { name: saves[0].name },
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await a.post('/api/saves', {
        data: { name: '攻击' },
        headers: { Origin: 'https://other.invalid' },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await a.delete(`/api/saves/${id}`, {
        data: { name: '错误名称' },
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(404);
  const before = await (await a.get(`/api/saves/${id}/world`)).json();
  const after = await (await a.get(`/api/saves/${id}/world`)).json();
  expect(before).toEqual(after);
  await pool.query('UPDATE game_saves SET save_version=$1 WHERE id=$2', [
    '99.0.0',
    id,
  ]);
  expect((await a.get(`/api/saves/${id}/world`)).status()).toBe(409);
  await pool.query('UPDATE game_saves SET save_version=$1 WHERE id=$2', [
    '0.2.0',
    id,
  ]);
  for (const system of before.systems)
    for (const planet of system.planets)
      if (!planet.known) expect(planet.details).toBeUndefined();
  expect(
    (
      await a.delete(`/api/saves/${id}`, {
        data: { name: saves[0].name },
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(204);
  expect((await a.get(`/api/saves/${id}/world`)).status()).toBe(404);
  expect(
    (
      await a.post('/api/saves', {
        data: { name: '新的宇宙' },
        headers: { Origin: origin, 'Idempotency-Key': randomUUID() },
      })
    ).status(),
  ).toBe(201);
  const cookies = await a.storageState();
  await a.post('/api/auth/sign-out', { data: {}, headers: { Origin: origin } });
  expect((await a.get('/api/saves')).status()).toBe(401);
  const oldSession = await requestFactory.newContext({
    baseURL: origin,
    storageState: cookies,
  });
  expect((await oldSession.get('/api/saves')).status()).toBe(401);
  await oldSession.dispose();
  const login = await a.post('/api/auth/sign-in/email', {
    data: credentials,
    headers: { Origin: origin },
  });
  expect(login.ok()).toBeTruthy();
  expect(await (await a.get('/api/saves')).json()).toHaveLength(3);
  const cookiesNow = (await a.storageState()).cookies;
  expect(
    cookiesNow.some((c) => c.httpOnly && c.sameSite === 'Lax'),
  ).toBeTruthy();
  expect(
    (
      await a.post('/api/auth/update-user', {
        data: { name: '更新后的指挥官' },
        headers: { Origin: origin },
      })
    ).ok(),
  ).toBeTruthy();
  expect((await (await a.get('/api/auth/get-session')).json()).user.name).toBe(
    '更新后的指挥官',
  );
  const anotherDevice = await requestFactory.newContext({ baseURL: origin });
  await anotherDevice.post('/api/auth/sign-in/email', {
    data: credentials,
    headers: { Origin: origin },
  });
  const nextPassword = `${randomUUID()}Aa2`;
  expect(
    (
      await a.post('/api/auth/change-password', {
        data: {
          currentPassword: credentials.password,
          newPassword: nextPassword,
          revokeOtherSessions: true,
        },
        headers: { Origin: origin },
      })
    ).ok(),
  ).toBeTruthy();
  expect((await anotherDevice.get('/api/saves')).status()).toBe(401);
  await a.post('/api/auth/sign-out', { data: {}, headers: { Origin: origin } });
  const oldPasswordLogin = await a.post('/api/auth/sign-in/email', {
    data: credentials,
    headers: { Origin: origin },
  });
  expect(oldPasswordLogin.status()).toBe(401);
  const limited = await a.post('/api/auth/sign-in/email', {
    data: { email: credentials.email, password: nextPassword },
    headers: { Origin: origin },
  });
  expect(limited.status()).toBe(429);
  const retrySeconds = Number(limited.headers()['x-retry-after']);
  expect(retrySeconds).toBeGreaterThan(0);
  expect(retrySeconds).toBeLessThanOrEqual(10);
  await new Promise((resolve) =>
    setTimeout(resolve, (retrySeconds + 0.2) * 1000),
  );
  const changedPasswordLogin = await a.post('/api/auth/sign-in/email', {
    data: { email: credentials.email, password: nextPassword },
    headers: { Origin: origin },
  });
  expect(changedPasswordLogin.status()).toBe(200);
  await anotherDevice.dispose();
  await a.dispose();
  await b.dispose();
});
test('browser registration → save → galaxy → home → refresh → logout; mobile layout', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: '创建账户', exact: true }).click();
  const email = `${randomUUID()}@test.invalid`;
  await page.getByLabel('指挥官名称').fill('远征指挥官');
  await page.getByLabel('邮箱地址').fill(email);
  await page.getByLabel('密码', { exact: true }).fill(`${randomUUID()}Aa1`);
  await page.getByRole('button', { name: '创建指挥官账户' }).click();
  await expect(
    page.getByRole('heading', { name: '准备出发，远征指挥官。' }),
  ).toBeVisible();
  const user = await pool.query('SELECT id FROM "user" WHERE email=$1', [
    email,
  ]);
  users.push(user.rows[0].id);
  await page.getByRole('button', { name: '开启新的远征' }).first().click();
  await page.getByLabel('存档名称', { exact: true }).fill('第一次远征');
  await page.getByRole('button', { name: '启程' }).click();
  await expect(
    page.getByRole('heading', { name: '每一颗星辰，都是新的可能。' }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: '.local/galaxy-desktop.png', fullPage: true });
  const worldURL = await page.evaluate(
    () => `/api/saves/${localStorage.getItem('colony-active-save')}/world`,
  );
  const before = await (await page.request.get(worldURL)).json();
  await page.getByLabel('搜索星系').fill('R2-S01');
  await page
    .locator('.search-results')
    .getByRole('button', { name: '未识别星系 R2-S01', exact: true })
    .click();
  await page.getByRole('button', { name: '进入星系', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '中心恒星', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /未知行星 R2-S01-P1/ }).click();
  await expect(
    page.getByRole('heading', { name: '未知行星', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('矿藏概况')).toHaveCount(0);
  await page
    .getByRole('button', { name: '返回母星', exact: true })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: '新曙光', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: '.local/system-desktop.png', fullPage: true });
  await page.getByRole('button', { name: '管理母星', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '地表设施', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /舰船档案/ }).click();
  await expect(
    page.getByRole('heading', { name: '先驱号', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '星际地图', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: '每一颗星辰，都是新的可能。' }),
  ).toBeVisible();
  expect(await (await page.request.get(worldURL)).json()).toEqual(before);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.local/galaxy-mobile.png', fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole('button', { name: /探索指南/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: /远征指挥官 存档与账户/ }).click();
  await page
    .getByRole('button', { name: '删除 第一次远征', exact: true })
    .click();
  await page.getByRole('dialog').getByRole('textbox').fill('第一次远征');
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '第一次远征', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '欢迎回来，指挥官', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
