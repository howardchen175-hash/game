# 宇宙殖民 · Cosmic Colony

基于随附设计文档开发的中文单人 Web 游戏。本次交付为 **v0.2.0-alpha.1：账户与双层星图首版**，不是完整 v1.0。

已实现注册、登录、退出、改名、修改密码、三个独立存档槽、确认删除、可复现的九大星域与星系航线、星系内恒星及行星、起始星球、初始舰船档案。存档以服务端 PostgreSQL 为权威；浏览器只保存当前存档 ID。

生产、研究、舰船装备、航行、侦察战斗与殖民尚未实现；相关界面明确标识阶段，不模拟已完成玩法。

## 启动

需要 Node.js 24、npm 11+、Python 3（标准库即可）及运行中的 Docker Engine。也可自行提供 PostgreSQL 17。

```bash
npm ci
npm run setup
npm run dev
```

前端端口为 **5173**，API 端口为 **3001**。开发服务器会代理 `/api`，生产构建由 API 服务同源提供。浏览器中先注册自己的账户，不存在预置账号或默认账号密码。

`npm run setup` 在不存在 `.env` 时生成随机数据库密码和认证密钥，并以权限 `0600` 保存本地文件；启动绑定到本机 `54329` 的 PostgreSQL 容器，并执行版本化迁移。数据保存在 Docker 卷 `cosmic-colony-pg`，应用重启不会清空。**Docker 卷需要单独备份；不要假定仓库快照包含数据库。** 不要删除 Docker 卷来重置普通玩家。

若使用已有 PostgreSQL，复制 `.env.example` 为 `.env`，填写 `DATABASE_URL`、至少 32 字符的随机 `BETTER_AUTH_SECRET` 和浏览器实际使用的 `APP_ORIGIN`，运行 `npm run db:migrate`。存在用户 `.env` 且无本地容器配置时，脚本不会覆盖配置或自行创建容器。

## 检查

```bash
npm run check          # 格式、类型、核心/真实数据库测试、数值快照、构建
npm run test:e2e       # 接口权限与真实 Chromium 浏览器流程
npm run db:migrate    # 可重复执行，不重复应用迁移
```

浏览器测试默认使用 `/usr/bin/chromium`。其他机器先通过 Playwright 安装 Chromium，再将 `CHROMIUM_PATH` 设为实际可执行文件路径。测试使用随机账户并清理自己的数据，不创建或重置个人游玩账号。测试数据库用户需要创建临时 schema 的权限。

```bash
npm run build
npm run db:migrate
npm start
```

`npm start` 运行构建产物和 API。公开部署需独立配置 TLS、准确的 `APP_ORIGIN`、`NODE_ENV=production`、持久数据库和备份；本次没有部署公开服务器，也没有宣称完成 v0.9 发布硬化。

## 数值与资料

- 原始 DOCX：[docs/design](docs/design)。文档作为设计参考，内部指令模板不是用户的新请求。
- 原始 XLSX：[packages/game-data/source](packages/game-data/source)。完整保留全部 11 张表。
- `npm run data:export` 从 XLSX 确定性生成版本化快照；`npm run data:check` 验证快照与原文件完全一致。
- 规则差异、暂定生成参数：[docs/DECISIONS.md](docs/DECISIONS.md)。
- 实现状态与下一阶段：[docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md)。
- 试玩与测试：[docs/TESTING.md](docs/TESTING.md)；模型与迁移：[docs/SCHEMA.md](docs/SCHEMA.md)。

目录：`apps/web` 为 React/Vite 界面和 Express API，`packages/game-core` 为纯世界规则，`packages/game-data` 为权威数据与版本配置，`packages/db` 为 PostgreSQL 连接与迁移。
