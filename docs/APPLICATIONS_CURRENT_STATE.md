# Applications 当前实现状态（2026-04-24）

## 已完成

- `applications` 申请流已接通（申请 / 取消 / 发布者查看申请 / 接受申请）。
- `teams.application_count` 已用于前端卡片展示，且 `0` 不展示“申请中”文案。
- 角色驱动按钮已落地：
  - 发布者（open）：`查看申请列表` + `取消发布`
  - 申请人（已申请）：`取消申请`
  - 路人：`申请加入`
  - matched 成员：`查看队友`
- 取消申请与取消发布都已改为原生风格确认弹窗。
- 发布者“取消发布”改为删除房间（调用 `delete_open_team`）。
- 昵称按 `user_id` 本地持久化（`preferred_nickname:<uid>`）。
- 等级按 `user_id` 本地持久化（`preferred_level:<uid>`）。
- 同日参与限制已加到后端：
  - 有 open 发布时不能申请其他房间。
  - 同一用户同一天只能参与一个队伍。
  - 接受申请时会再次校验申请人是否已在同日其他队伍。
- 申请人被接受后，`matched` 卡片可见性已改为以数据库 `team_members` 为主，不再只依赖 localStorage。

## 关键 SQL 函数（当前使用）

- `create_application(p_team_id, p_applicant_nickname, p_applicant_qq)`
- `cancel_application(p_application_id)`
- `list_team_active_applications(p_team_id)`
- `accept_application(p_application_id)`
- `delete_open_team(p_team_id)`

> 函数定义来源：`docs/sql/2026-04-24_applications_trigger_rls_rpc.sql`

## 已知注意事项

- 若线上仍报旧错误（例如 `team_id is ambiguous`），优先检查 Supabase 当前函数定义是否已被旧版本覆盖。
- 建议上线前固定一次 SQL 发布流程：先 `drop function` 再 `create or replace function`，避免旧签名残留。

## 建议补充（下一阶段）

- 申请列表中增加“拒绝申请”按钮（当前仅接受）。
- 增加操作审计字段（`handled_by`, `handled_at`）便于排查。
- 将关键限制再落一层数据库约束（减少旁路写入风险）。
