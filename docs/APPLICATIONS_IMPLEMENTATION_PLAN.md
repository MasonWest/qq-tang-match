# Applications 改造实施方案（逐步落地）

## 1. 目标与范围

本次改造新增 `applications`（申请）能力，满足以下需求：

- 一个 `user_id` 最多同时申请 3 个房间。
- 申请人可取消自己的申请。
- 发布人可在自己发布且 `open` 的房间中查看申请列表。
- `open` 房间卡片显示“当前 N 人申请中”。

非目标（本轮先不做）：

- 自动匹配（系统自动接受申请）。
- 消息通知系统。

---

## 2. 业务规则（先对齐）

### 2.1 申请侧规则

- 仅可申请 `status = 'open'` 的房间。
- 不能申请自己发布的房间。
- 同一用户对同一房间最多 1 条“有效申请”。
- 同一用户全局最多 3 条“有效申请”。
- 申请可取消；取消后不计入“最多 3 条”。

### 2.2 发布侧规则

- 仅房主可查看该房间申请列表。
- 房主可接受 1 个申请，接受后房间转为 `matched`。
- 房主接受后，其它有效申请自动失效（`rejected`）。

### 2.3 展示规则

- `open` 卡片显示：`当前 N 人申请中`（N=有效申请数）。
- `matched` 不显示申请入口和申请计数。

---

## 3. 数据库设计

### 3.1 新表：`applications`

```sql
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  applicant_user_id uuid not null,
  applicant_nickname text not null,
  applicant_qq text,
  status text not null default 'active' check (status in ('active', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 3.2 索引与唯一约束

```sql
create index if not exists idx_applications_team_status on applications(team_id, status);
create index if not exists idx_applications_user_status on applications(applicant_user_id, status);

-- 同一用户对同一房间只能有一条 active 申请
create unique index if not exists uq_applications_team_user_active
  on applications(team_id, applicant_user_id)
  where status = 'active';
```

### 3.3 计数字段（推荐）

为避免前端每次做聚合，建议在 `teams` 增加冗余计数：

```sql
alter table teams
add column if not exists application_count int not null default 0;
```

再用触发器维护 `application_count`（active +1/-1）。

---

## 4. RLS 与权限建议

### 4.1 applications 表 RLS

- 申请人可 `select`/`update(cancel)` 自己的申请。
- 房主可 `select` 自己房间的申请列表。
- 普通用户不可查看他人申请详情。

### 4.2 关键写操作建议用 RPC（强烈建议）

以下操作用 SQL 函数一次性完成，避免并发和越权问题：

1. `create_application(team_id, nickname, qq)`
2. `cancel_application(application_id)`
3. `accept_application(application_id)`

`accept_application` 需要同事务完成：

- 校验操作者是房主；
- 校验房间仍是 `open`；
- 将目标申请置为 `accepted`；
- 其它 `active` 置为 `rejected`；
- 更新 `teams.status='matched'` + 回填 `joiner_nickname/joiner_qq_number`；
- 插入 `team_members`（joiner）。

---

## 5. 前端改造步骤

## Step 1: 数据读取改造（只读）

目标：列表能看到 `application_count`。

- `fetchReservations` 查询 `teams` 时读取 `application_count`。
- 卡片在 `open` 状态显示：`当前 {application_count} 人申请中`。

涉及文件：

- `src/App.jsx`

## Step 2: 申请与取消

目标：用户可以申请/取消。

- 在 `open` 卡片增加按钮：`申请加入`。
- 如果用户已申请当前房间，按钮切为 `取消申请`。
- 调用 RPC：`create_application` / `cancel_application`。
- 成功后刷新列表或做局部状态更新。

涉及文件：

- `src/App.jsx`

## Step 3: 发布人查看申请列表

目标：房主能在自己 `open` 房间查看申请人。

- 在“自己发布的 open 房间”卡片上增加 `查看申请` 按钮。
- 弹窗展示申请列表（昵称、QQ、申请时间）。
- 每条申请有 `接受` 按钮。

涉及文件：

- `src/App.jsx`
- （可选）`src/components/ApplicationsModal.jsx`

## Step 4: 接受申请 -> matched

目标：房主接受后完成匹配。

- 调用 RPC `accept_application(application_id)`。
- 成功后刷新卡片：房间应变 `matched`，不再显示申请入口。

涉及文件：

- `src/App.jsx`

## Step 5: 边界处理与提示

- 用户达到 3 条 active 申请：提示“最多同时申请 3 个房间”。
- 房间刚被别人接受导致失效：提示“房间已匹配，申请失败”。
- 房主不再是 open 房间（并发）：提示“操作已失效，请刷新”。

---

## 6. SQL 落地顺序（建议）

1. 建 `applications` 表 + 索引 + 约束。
2. 给 `teams` 增加 `application_count`。
3. 建触发器维护 `application_count`。
4. 开启并配置 `applications` 的 RLS。
5. 创建 3 个 RPC：`create_application`、`cancel_application`、`accept_application`。
6. 用 SQL 脚本做最小回归验证。

---

## 7. 前端联调顺序（建议）

1. 先做“只读计数展示”（风险最低）。
2. 再做“申请/取消”。
3. 再做“房主查看列表 + 接受”。
4. 最后做文案和交互细节收口。

---

## 8. 验收清单（Definition of Done）

- 普通用户可申请 open 房间，且最多 3 条 active。
- 申请人可取消自己的 active 申请。
- 房主可看到自己 open 房间的申请列表。
- 房主接受某申请后，房间转 matched，其他申请自动 rejected。
- open 卡片准确显示“当前 N 人申请中”。
- RLS 下无法越权查看/修改他人申请。

---

## 9. 我们下一步怎么做

建议按这个顺序开始：

1. 我先写好第一版 SQL（表 + 索引 + `application_count` + 触发器）。
2. 你在 Supabase 执行后，我接着写 RPC 三件套。
3. 然后我改 `App.jsx`，先把“申请人数展示”上线，再逐步加申请流。

---

## 10. 当前进度（2026-04-24）

已落地：

- 申请/取消/查看申请/接受申请全链路。
- 角色驱动按钮渲染。
- 取消申请与取消发布确认弹窗。
- 取消发布直接删除房间。
- `user_id` 维度昵称与等级本地持久化。
- 同日参与限制（申请时与接受时双校验）。
- matched 可见性从 localStorage 迁移为数据库成员关系判定（localStorage 仅兜底）。

状态快照详见：

- `docs/APPLICATIONS_CURRENT_STATE.md`
