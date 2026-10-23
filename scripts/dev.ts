import { spawn } from 'node:child_process';
import { migrate } from '../packages/db/migrate.ts';
import { pool } from '../packages/db/client.ts';
await migrate();
await pool.end();
const children = ['dev:api', 'dev:web'].map((script) =>
  spawn('npm', ['run', script], { stdio: 'inherit' }),
);
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  children.forEach((child) => child.kill('SIGTERM'));
  setTimeout(() => process.exit(code), 500);
}
children.forEach((child) => child.on('exit', (code) => stop(code || 0)));
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
