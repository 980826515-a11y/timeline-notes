# 📝 时间轴便签 (Timeline Notes)

带提醒的桌面便签应用，到点高亮提醒，Tauri 打包成原生应用。

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 📝 快速记录 | 顶部输入区写内容，选颜色，一键发布 |
| ⏰ 到期提醒 | 每条便签设定到期时间，逾期红框高亮 + ⚠️ 角标 |
| 🎨 iOS 式滑轮选时间 | 自研滑轮选择器，分钟只列 5 的倍数 |
| ✏️ 编辑便签 | 点击编辑按钮，原地编辑内容和到期时间 |
| 🗑️ 批量删除 | 框选多条便签一次性删除，带二次确认 |
| 🔍 关键词搜索 | 实时搜索便签内容 |
| 📤 导出 / 📥 导入 | JSON 备份，跨设备迁移 |
| 💾 本地持久化 | 数据存 localStorage，刷新不丢 |
| ⌨️ 快捷键 | `Enter` 发布，`Shift + Enter` 换行 |

## 🚀 快速开始

### 开发模式

```bash
npm install
npm run dev
```

### 打包发布

详见 [docs/RELEASE.md](docs/RELEASE.md)。

简而言之：
1. `git tag v1.0.0 && git push origin v1.0.0`
2. GitHub Actions 自动构建 Windows `.exe`
3. 从 Releases 下载安装包

## 📂 项目结构

```
timeline-notes/
├── src/                    前端文件（应用本体）
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── store.js            数据层（localStorage CRUD）
│       ├── timeline.js         时间轴渲染（按日期分组、逾期标记）
│       ├── app.js              应用入口（事件绑定、交互）
│       ├── emoji-data.js       emoji 表情库
│       └── datetime-picker.js  自研滑轮时间选择器
├── src-tauri/              Tauri 后端（Rust 壳）
└── .github/workflows/      GitHub Actions（自动打 Windows exe）
```

## 🏗️ 架构

```
app.js  ──事件绑定、用户交互──┐
                              │
timeline.js ──DOM 渲染─────────┤── 数据流
                              │
store.js   ──localStorage──────┘
```

- **store.js**：唯一数据入口，封装 localStorage 读写
- **timeline.js**：纯渲染层，按日期分组、逾期标记、滑轮选时间
- **app.js**：协调层，绑定事件、调用 store、驱动渲染
- **datetime-picker.js**：可复用的 iOS 式滑轮日期时间选择器

## 📐 数据结构

```js
{
  id: "时间戳+随机串",
  content: "便签正文",
  color: "#fff5cc",
  createdAt: "2026-07-03T10:00:00.000Z",
  updatedAt: "2026-07-03T10:00:00.000Z",
  dueTime: "2026-07-10T15:30",        // 到期时间
  status: "pending" | "done",          // 处理状态
  statusUpdatedAt: "2026-07-07T..."    // 状态变更时间
}
```

## 📦 技术栈

- 前端：原生 HTML + CSS + JavaScript，零依赖
- 桌面壳：Tauri 2（Rust）
- 打包：GitHub Actions（云端构建 Windows exe）
