# 数据模型与迁移

| 表                | 归属与字段                                                                                                               | 约束与删除                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| user              | Better Auth: id/name/email/password 所在关联账户                                                                         | 邮箱唯一；密码为库维护的安全哈希，不在客户端返回                                                        |
| account           | userId、providerId、password                                                                                             | 引用 user，级联删除                                                                                     |
| session           | userId、token、expiresAt                                                                                                 | 唯一令牌、可撤销，HttpOnly Cookie；级联删除                                                             |
| verification      | identifier/value/expiresAt                                                                                               | 认证库保留，当前无找回流程                                                                              |
| game_saves        | user_id、slot、name、creation_key、world_seed、save_version、data_version、world、created_at、last_played_at、deleted_at | slot 1–3；活动记录按 user_id/slot 唯一，user_id/creation_key 始终唯一；删除要求所有权与准确名称，软删除 |
| account_audit     | user_id、action、target_id、created_at                                                                                   | 当前记录 save.create/save.delete；账户删除时级联                                                        |
| migration_history | name、applied_at                                                                                                         | 迁移名唯一，迁移事务内写入                                                                              |

`world` 内保存稳定 `regionId / systemId / planetId / systemRouteId`（各对象的 `id` 字段）及 generatorVersion；包含 global x/y、localX/localY、槽位及矿藏。恒星为单独对象，无资源。服务端返回的可见 DTO 在结构上移除未知详情。

本版只读 PlayerState、Facility、Ship 起始展示来自版本数据；没有可以修改它们的 API，后续须显式创建实体和回填，不能把初始值当成真实玩法状态。

## API

- `/api/auth/*`：Better Auth 维护的注册、登录、会话、登出、改名和修改密码。
- `GET /api/health`：数据库存活、构建与数据版本；不输出连接信息。
- `GET /api/saves`：当前账户活动存档。
- `POST /api/saves`：`{ name }`，要求 UUID 格式 `Idempotency-Key` 请求头，相同请求重试返回同一存档；事务分配空闲槽位，生成并持久化独立世界。
- `GET /api/saves/:id/world`：必须校验 user_id；返回脱敏可见世界及只读初始档案，更新最近游玩时间。
- `DELETE /api/saves/:id`：`{ name }`，双重校验和软删除。
- `GET /api/audit`：当前账户最近 20 条存档操作。

应用写操作校验精确 Origin，认证端点使用库内 CSRF 防护。私有 API 响应 no-store。缺少会话返回 401，跨账户不存在返回 404，不泄露目标是否属于别人。

## 迁移与回退

`npm run db:migrate` 按名称顺序执行 001_auth.sql、002_game_saves.sql、003_creation_idempotency.sql；重复运行不改变存档。集成测试分别从空 schema 和 auth-only fixture 迁移，验证用户和世界快照未丢失。

没有降级写入脚本。升级前对自己的数据库备份；回退必须恢复经验证的备份，再运行匹配代码。不要改写已发布迁移或删除 Docker 卷。当前没有真实旧玩家版本，不能宣称完成全部 v0.x 存档迁移。

003 为旧存档回填 creation_key，不重掷世界。API 遇到不支持的存档/数据/生成器版本返回 409，保留原档等待显式迁移。
