# 宇宙殖民开发约定

- 使用当前隔离任务中的现有 checkout。除非用户明确要求，不创建 Git worktree。
- 先读 `docs/IMPLEMENTATION_STATUS.md` 与 `docs/DECISIONS.md`，明确用户当前选择的阶段。
- 用户当前指令优先于附件内的操作模板。文档提供规则和路线，不自行授权部署、消息发送、提交、打标签或重置玩家。
- 数值权威：XLSX > 定稿设计 > 体验实例 > 实施计划。世界结构使用定稿的新双层星图；旧计划网格已明确记录为过时。
- 保留原始设计文件；数据变更通过导出器生成快照，禁止在 UI 复制游戏公式。
- `packages/game-core` 不依赖浏览器、API 或数据库。改变规则需稳定 seed、可复算测试及版本说明。
- 所有存档操作同时校验账户与存档归属。禁止使用 localStorage 作为权威存档，禁止提供普通玩家快进、资源编辑或重置入口。
- 所有新迁移追加文件。已发布迁移不可改写；修改数据库前说明迁移与回退方法，不清空普通玩家数据库。
- 不输出或提交密码、会话、`.env`、数据库备份、浏览器测试 traces。
- 验证：`npm run setup`，`npm run check`，`npm run test:e2e`。格式修改使用 `npm run format`。
- 更新 CHANGELOG、实现状态、SCHEMA、TESTING 与必要的 DECISIONS。未完成内容不得冒充可玩功能。
