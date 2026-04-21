# 数据库重构方案：从单表到 Teams + Team_Members 模型

## 一、背景说明

当前 `reservations` 表将发布人（nickname）和队友（teammate）混在同一条记录中，导致：

- 无法通过 RLS 实现 matched 队伍仅成员可见
- QQ 信息只有一个字段，无法区分谁是谁
- 不支持匿名用户（anon auth）的身份隔离
- 无法进行多成员队伍扩展

本次重构将拆分为 `teams`（队伍信息）和 `team_members`（成员关系）两张表。

---

## 二、SQL 表结构设计

### 2.1 teams 表

```sql
CREATE TABLE teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL,
  start_time  TEXT NOT NULL,        -- "20:00"
  end_time    TEXT NOT NULL,        -- "22:00"
  level       INT NOT NULL DEFAULT 1,
  game_modes  TEXT[] DEFAULT '{}',   -- ['football', 'newyear']
  accept_strangers BOOLEAN DEFAULT FALSE,
  team_name   TEXT,                 -- AI 生成的队名
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched')),
  creator_nickname TEXT NOT NULL,    -- 发布者昵称
  creator_qq TEXT,                  -- 发布者QQ
  joiner_nickname TEXT,             -- 加入者昵称
  joiner_qq_number TEXT,            -- 加入者QQ
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 team_members 表

```sql
CREATE TABLE team_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,         -- auth.uid() or anon key
  nickname    TEXT NOT NULL,
  qq_number   TEXT,
  is_owner    BOOLEAN DEFAULT FALSE, -- 发布人标记
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(team_id, user_id)
);
```

### 2.3 匿名用户支持（启用 Supabase Anonymous Auth）

在 Supabase Dashboard 中开启 Anonymous Auth：

1. 进入 Authentication → Providers
2. 找到 **Anonymous** 开关 → 开启
3. 设置 `GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED = true`

前端首次访问时调用：

```js
const { data, error } = await supabase.auth.signInAnonymously();
// data.user.id 就是后续存到 team_members.user_id 的值
```

---

## 三、数据迁移 SQL

### 步骤 1：先建表

```sql
-- 创建 teams 表
CREATE TABLE teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL,
  start_time  TEXT NOT NULL,
  end_time    TEXT NOT NULL,
  level       INT NOT NULL DEFAULT 1,
  game_modes  TEXT[] DEFAULT '{}',
  accept_strangers BOOLEAN DEFAULT FALSE,
  team_name   TEXT,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 创建 team_members 表
CREATE TABLE team_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  nickname    TEXT NOT NULL,
  qq_number   TEXT,
  is_owner    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);
```

### 步骤 2：迁移数据

```sql
-- 将 reservations 拆成 teams + team_members
DO $$
DECLARE
  r RECORD;
  new_team_id UUID;
  owner_user_id UUID := '00000000-0000-0000-0000-000000000000'::UUID; -- 占位，实际迁移时应替换为匿名用户ID
  member_user_id UUID := '00000000-0000-0000-0000-000000000001'::UUID; -- 占位
BEGIN
  FOR r IN SELECT * FROM reservations LOOP

    -- 插入 teams
    INSERT INTO teams (date, start_time, end_time, level, game_modes, accept_strangers, team_name, status, created_at)
    VALUES (r.date, r.start_time, r.end_time, r.level, r.game_modes, r.accept_strangers, r.team_name, r.status, r.created_at)
    RETURNING id INTO new_team_id;

    -- 插入发布人
    INSERT INTO team_members (team_id, user_id, nickname, qq_number, is_owner, created_at)
    VALUES (new_team_id, owner_user_id, r.nickname, r.qq_number, TRUE, r.created_at);

    -- 如果有队友，插入队友
    IF r.teammate IS NOT NULL THEN
      INSERT INTO team_members (team_id, user_id, nickname, qq_number, is_owner, created_at)
      VALUES (new_team_id, member_user_id, r.teammate, NULL, FALSE, r.created_at);
    END IF;

  END LOOP;
END $$;
```

> ⚠️ 注意：上述 `owner_user_id` 和 `member_user_id` 是占位符。实际迁移时，需要为每个用户分配真实的 `auth.uid()`（可以是通过匿名登录生成的 UUID）。如果你希望保留原有数据但不需要追溯到具体用户，可以统一用一个特殊 UUID 作为占位符。

### 步骤 3：清理旧表（验证无误后执行）

```sql
-- 确认新表数据完整后再执行
DROP TABLE reservations;
```

---

## 四、RLS 策略（核心）

### 4.1 开启 RLS

```sql
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
```

### 4.2 teams 表策略

```sql
-- 策略1：open 队伍所有人可见
CREATE POLICY "teams_open_visible_to_all"
  ON teams FOR SELECT
  USING (status = 'open');

-- 策略2：matched 队伍仅成员可见
CREATE POLICY "teams_matched_visible_to_members"
  ON teams FOR SELECT
  USING (
    status = 'matched'
    AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
    )
  );

-- 策略3：已登录用户可创建队伍（匿名用户也允许）
CREATE POLICY "teams_insert_auth"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 策略4：仅成员可更新自己队伍
CREATE POLICY "teams_update_members"
  ON teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
    )
  );
```

### 4.3 team_members 表策略

```sql
-- 策略1：仅成员可查看（被 RLS 限制，非成员查不到）
CREATE POLICY "team_members_select_members"
  ON team_members FOR SELECT
  USING (user_id = auth.uid());

-- 策略2：允许加入者插入自己
CREATE POLICY "team_members_insert_self"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
```

---

## 五、前端调用流程建议

### 5.1 初始化：匿名登录

```js
// supabaseClient.js 或 App 初始化时
import { supabase } from './supabaseClient';

// 检查是否有 session，没有则匿名登录
async function ensureAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    await supabase.auth.signInAnonymously();
  }
  // 后续所有操作都会携带 anon token
}

ensureAuth();
```

### 5.2 发布队伍（创建 + 插入发布人）

```js
// 1. 创建 team
const { data: team, error } = await supabase
  .from('teams')
  .insert([{
    date: selectedDate,
    start_time: stepToTime(timeRange[0]),
    end_time: stepToTime(timeRange[1]),
    level: selectedLevel,
    game_modes: selectedModes,
    accept_strangers: acceptStrangers,
    status: 'open'
  }])
  .select()
  .single();

// 2. 插入 team_members（发布人）
await supabase
  .from('team_members')
  .insert([{
    team_id: team.id,
    user_id: (await supabase.auth.getUser()).data.user.id,
    nickname: nickname,
    qq_number: qqNumber,
    is_owner: true
  }]);
```

### 5.3 查询列表（只显示 open 队伍）

```js
// 因为 RLS 限制，matched 队伍对非成员不可见
// 所以直接查 teams 即可，无需额外过滤
const { data } = await supabase
  .from('teams')
  .select(`
    *,
    team_members(nickname, is_owner)
  `)
  .eq('date', selectedDate)
  .order('created_at', { ascending: false });

// 返回的每条记录会包含 owner 的 nickname
// 但不会暴露 matched 队伍中其他成员的信息
```

### 5.4 加入队伍

```js
// 1. 更新 team 状态
await supabase
  .from('teams')
  .update({ status: 'matched' })
  .eq('id', teamId);

// 2. 插入自己为成员
await supabase
  .from('team_members')
  .insert([{
    team_id: teamId,
    user_id: (await supabase.auth.getUser()).data.user.id,
    nickname: joinNickname,
    qq_number: null,  // 申请者不强制填QQ
    is_owner: false
  }]);
```

### 5.5 查看队友联系方式（matched 后才能看到）

```js
// 查询队伍成员
const { data } = await supabase
  .from('teams')
  .select(`
    *,
    team_members(*)
  `)
  .eq('id', teamId)
  .single();

// 因为是成员，RLS 允许返回所有 team_members
// data.team_members 包含双方的 nickname 和 qq_number
```

---

## 六、需要同步修改的前端文件

| 文件 | 改动点 |
|------|--------|
| `supabaseClient.js` | 添加匿名登录初始化逻辑 |
| `App.jsx` | 所有 `reservations` 相关查询改为 `teams` |
| `App.jsx` | 发布逻辑拆分为插入 team + team_member |
| `App.jsx` | 加入逻辑改为更新 team + 插入 team_member |
| `App.jsx` | matched 后通过 `team_members` 查询联系方式 |
| `App.jsx` | 移除本地 nickname 重复检查（由 RLS 和用户身份保证） |

---

## 七、迁移执行顺序

```
Step 1: 在 Supabase Dashboard 开启 Anonymous Auth
Step 2: 执行建表 SQL（teams + team_members）
Step 3: 执行数据迁移 SQL
Step 4: 执行 RLS 策略 SQL
Step 5: 验证新表数据完整性
Step 6: 前端代码修改适配新表
Step 7: 测试通过后删除旧表 reservations
```

---

## 八、关键注意事项

1. **匿名用户 ID 是持久的**：只要不清除浏览器 localStorage，匿名用户的 `auth.uid()` 保持不变。
2. **同一天不能重复发布**：可在应用层加限制（检查该 user_id 是否已有当天未匹配的 team_members 记录），也可通过前端状态管理。
3. **QQ 可见性**：`team_members` 表的 RLS 确保只有成员能查到对方 QQ，但发布人自己能看到所有成员（因为自己是成员之一）。
4. **向后兼容**：迁移完成后保留 `reservations` 表几天，确认无误后再删除。
