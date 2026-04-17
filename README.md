# QQ Tang Match

一个专为 QQ 堂玩家设计的组队匹配平台，帮助玩家在排位时间段快速找到合适的队友。

## 功能特性

- **快速发布预约**：选择时间段、等级，一键发布组队信息
- **陌生人组队控制**：可选择是否接受陌生人加入，保护隐私
- **联系方式管理**：接受陌生人组队时需填写 QQ，方便队友联系
- **实时匹配状态**：组队成功后显示队友信息和自动生成的队名
- **等级系统**：支持 QQ 堂 1-30 级等级选择
- **实时同步**：基于 Supabase 实时数据库，列表自动更新

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

### reservations

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| nickname | text | 发布者昵称 |
| start_time | text | 开始时间 (如 "20:00") |
| end_time | text | 结束时间 (如 "21:00") |
| level | integer | 等级 (1-30) |
| accept_strangers | boolean | 是否接受陌生人组队 |
| qq_number | text | QQ 号码（可选） |
| status | text | 状态：Waiting / Matched |
| teammate | text | 队友昵称 |
| team_name | text | 自动生成的队名 |
| created_at | timestamp | 创建时间 |

## 使用说明

### 发布预约

1. 输入游戏昵称
2. 选择等级
3. 选择是否接受陌生人组队
4. 拖动滑块选择时间段
5. 点击"发起预约"
6. 填写 QQ 号码（接受陌生人时为必填）

### 加入队伍

1. 在列表中找到合适的队伍
2. 点击"加入对战 2v2"
3. 输入自己的昵称
4. 如果对方留有 QQ，可查看并复制联系方式

## 排位时间

- 开放时段：20:00 - 22:00
- 时间段选择：每 15 分钟为一个间隔

## 注意事项

- 每个昵称每天只能发布一次预约
- 每个昵称每天只能加入一次队伍
- 操作有 10 秒冷却时间，防止频繁操作
- 接受陌生人组队时必须填写 QQ 号码

## 许可证

MIT
