# QQ Tang Match

一个专为 QQ 堂玩家设计的组队匹配平台，帮助玩家在排位时间段快速找到合适的队友。

## 功能特性

- **日期选择**：类似医院挂号的日期 Tab，支持查看和发布不同日期的预约
- **快速发布预约**：选择日期、时间段、等级、游戏模式，一键发布组队信息
- **游戏模式**：支持足球、新年、包子、英雄四种模式，玩家可多选
- **陌生人组队控制**：可选择是否接受陌生人加入，保护隐私
- **联系方式管理**：接受陌生人组队时需填写 QQ，方便队友联系
- **智能匹配状态**：组队成功后显示队友信息和自动生成的队名
- **等级系统**：支持 QQ 堂 1-30 级等级选择
- **本地即时更新**：发布和加入操作立即在本地显示，无需等待刷新
- **移动端适配**：完整的响应式设计，移动端体验优化

## 技术栈

- React 18
- Vite
- Tailwind CSS
- Framer Motion（动画）
- Supabase（后端数据库）
- 豆包 AI API（自动生成队名）

## 快速开始

### 环境要求

- Node.js 16+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env.local` 文件：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_DOUBAO_API_KEY=your_doubao_api_key  # 可选，用于自动生成队名
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 数据库表结构

### reservations (已废弃)

该表已重构为 `teams` 和 `team_members` 两张表。

### teams 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| date | date | 预约日期 |
| start_time | text | 开始时间 (如 "20:00") |
| end_time | text | 结束时间 (如 "22:00") |
| level | integer | 等级 (1-30) |
| game_modes | text[] | 游戏模式数组 (football/newyear/baozi/hero) |
| accept_strangers | boolean | 是否接受陌生人组队 |
| team_name | text | 自动生成的队名 |
| status | text | 状态：open / matched |
| creator_nickname | text | 发布者昵称 |
| creator_qq | text | 发布者QQ |
| joiner_nickname | text | 加入者昵称 |
| joiner_qq_number | text | 加入者QQ |
| created_at | timestamp | 创建时间 |

### team_members 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| team_id | uuid | 外键，关联 teams 表 |
| user_id | uuid | Supabase 用户ID (auth.uid()) |
| nickname | text | 成员昵称 |
| qq_number | text | 成员QQ |
| is_owner | boolean | 是否为队伍发布者 |
| created_at | timestamp | 创建时间 |

**注意：** `teams` 表中的 `creator_nickname`, `creator_qq`, `joiner_nickname`, `joiner_qq_number` 是冗余字段，用于简化前端获取队友联系方式的逻辑，避免因 RLS 限制而无法直接从 `team_members` 表获取。

## 使用说明

### 日期选择

- 页面中部有日期 Tab 栏（今天🔥、明天、周一、周二、周三）
- 点击不同日期可切换查看该日的预约列表
- 发布预约时，自动归属到当前选中的日期

### 发布预约

1. 选择日期（使用全局日期 Tab）
2. 输入游戏昵称
3. 选择等级
4. 选择游戏模式（至少一个，支持多选）
5. 选择是否接受陌生人组队
6. 拖动滑块选择时间段（默认 20:00-22:00，可拖动缩小范围）
7. 点击"发起预约"
8. 填写 QQ 号码（接受陌生人时为必填）

### 加入队伍

1. 在日期栏选择对应日期
2. 在列表中找到合适的队伍
3. 点击"加入对战"
4. 输入自己的昵称
5. 如果对方留有 QQ，可查看并复制联系方式

## 排位时间

- 开放时段：20:00 - 22:00
- 时间段选择：每 15 分钟为一个间隔
- 默认时间段：20:00 - 22:00（占满，用户可自行缩小范围）

## 游戏规则

- 每个昵称每天只能发布一次预约
- 每个昵称每天只能加入一次队伍
- 操作有 10 秒冷却时间，防止频繁操作
- 接受陌生人组队时必须填写 QQ 号码
- 已发布预约的昵称不能再发布或加入其他队伍

## RLS 策略（核心）

本项目使用 Supabase 的行级安全 (Row Level Security, RLS) 策略来控制数据访问。

### teams 表策略

- `teams_open_visible_to_all`：允许所有用户查看 `status = 'open'` 的队伍。
- `teams_matched_visible_to_members`：允许用户查看 `status = 'matched'` 的队伍，前提是该用户是该队伍的成员（通过子查询 `EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = teams.id AND team_members.user_id = auth.uid())` 检查）。
- `teams_insert_auth`：允许已认证用户（包括匿名用户）创建新队伍。
- `teams_update_members`：仅允许队伍成员更新自己的队伍记录。

### team_members 表策略

- `team_members_self_only`：**严格限制**，只允许用户查询和操作**自己的** `team_members` 记录 (`user_id = auth.uid()`)。这确保了数据隔离，避免了队友信息泄露和 RLS 递归问题。
- `team_members_insert_self`：允许已认证用户（包括匿名用户）插入自己的成员记录（加入队伍）。

> **重要提示**：由于 `team_members` 表的 RLS 限制，前端获取队友联系方式（QQ）的逻辑不再通过直接查询 `team_members` 表实现，而是依赖 `teams` 表中的冗余字段 (`creator_qq`, `joiner_qq_number`)。

## 前端调用流程建议

### 5.1 初始化：匿名登录与身份获取

```js
// supabaseClient.js 或 App 初始化时
import { supabase, ensureAnonymousAuth } from './supabaseClient';

// 检查是否有 session，没有则匿名登录
await ensureAnonymousAuth();

// 获取当前用户 ID，用于后续的权限和重复性检查
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  // 存储 currentUserId 到 state 中
  // setCurrentUserId(user.id);
}
```

### 5.2 发布队伍（创建 team + 插入 owner member）

```js
// 1. 插入 teams 记录，包含 creator 的信息和队伍的详细参数
const { data: team, error } = await supabase
  .from('teams')
  .insert([{
    date: selectedDate,
    start_time: stepToTime(timeRange[0]),
    end_time: stepToTime(timeRange[1]),
    level: selectedLevel,
    game_modes: selectedModes,
    accept_strangers: acceptStrangers,
    status: 'open',
    creator_nickname: nickname.trim(),
    creator_qq: qqNumber.trim() || null
  }])
  .select()
  .single();

// 2. 插入 team_members 记录，标记为 owner
await supabase
  .from('team_members')
  .insert([{
    team_id: team.id,
    user_id: user.id, // 当前用户的 ID
    nickname: nickname.trim(),
    qq_number: qqNumber.trim() || null,
    is_owner: true
  }]);
```

### 5.3 查询列表（显示 open 队伍；matched 队伍仅对成员可见）

```js
// 调用 Supabase API 查询 teams 表
// RLS 策略会自动过滤掉非成员不可见的 matched 队伍
const { data } = await supabase
  .from('teams')
  .select(
    `*,
     team_members(nickname, qq_number, is_owner)` // RLS 限制：这里只能查到自己的 team_member 记录
  )
  .eq('date', selectedDate)
  .order('created_at', { ascending: false });

// 注意：由于 RLS 限制，直接查询 team_members 只能获取到当前用户的记录。
// 列表显示发布者昵称需要依赖 teams 表的 creator_nickname 字段。
// matched 队伍的队友信息需要通过 teams 表的冗余字段获取。
```

### 5.4 加入队伍（插入 member + 更新 team 状态和冗余字段）

```js
// 1. 插入 team_members 记录，用户作为加入者
await supabase
  .from('team_members')
  .insert([{
    team_id: teamId, // 目标队伍 ID
    user_id: user.id, // 当前用户的 ID
    nickname: joinNickname.trim(),
    qq_number: joinQQNumber.trim() || null,  // 加入者的 QQ
    is_owner: false
  }]);

// 2. 更新 teams 记录，设置为 matched 状态，并填入加入者的信息
await supabase
  .from('teams')
  .update({
    status: 'matched',
    joiner_nickname: joinNickname.trim(),
    joiner_qq_number: joinQQNumber.trim() || null
  })
  .eq('id', teamId);
```

### 5.5 查看队友联系方式（通过 teams 表的冗余字段）

```js
// 查询特定队伍信息，包含冗余的 creator 和 joiner 信息
const { data: teamInfo } = await supabase
  .from('teams')
  .select(`
    creator_nickname, creator_qq, joiner_nickname, joiner_qq_number, team_name
  `)
  .eq('id', teamId)
  .single();

// teamInfo.creator_qq 和 teamInfo.joiner_qq_number 即为队友的联系方式
```

## 许可证

MIT

## 2026-04-24 Update (Applications Flow)

This project now supports an application-driven matching flow:

- Open room card shows application count when `application_count > 0`.
- Role-driven actions on room cards:
  - Owner (open room): `查看申请列表` and `取消发布`
  - Applicant (already applied): `取消申请`
  - Visitor: `申请加入`
  - Matched member: `查看队友`
- Owner can accept an application from the application list modal.
- If accepted, room becomes `matched`, and other active applications are invalidated.
- Owner cancel-publish deletes the open room directly.
- Nickname and level are persisted per user id in localStorage:
  - `preferred_nickname:<user_id>`
  - `preferred_level:<user_id>`

### Backend RPCs in use

- `create_application`
- `cancel_application`
- `list_team_active_applications`
- `accept_application`
- `delete_open_team`

### Source of truth docs

- `docs/APPLICATIONS_CURRENT_STATE.md`
- `docs/APPLICATIONS_IMPLEMENTATION_PLAN.md`
- `docs/sql/2026-04-24_applications_trigger_rls_rpc.sql`
