# 到期时间与逾期标记 设计

> 日期：2026-07-07
> 主题：便签新增"用户自定义到期时间 + 逾期高亮标记"功能

## 背景

项目原本是纯记录工具（日记/待办/想法）。用户希望便签能设定一个**到期时间**，超过时间后**显眼标记**，用户可手动"忽略"（标记已处理）或"重新标记"。这是"逾期可视化"，不是"通知推送"。

## 目标

- 每条便签可**选填**一个到期时间（dueTime）
- 逾期未处理 → 卡片高亮（红边框 + ⚠️ 角标）
- 用户可手动"忽略"或"重新标记"
- 纯前端、零依赖、页面打开时生效

## 非目标

- 不做通知推送（Notification API、声音、系统弹窗）
- 不加后端
- 不改现有分类（日记/待办/想法）
- 不改 emoji、导入导出、批量删除、框选等现有功能
- 不做"仅看待处理"筛选（YAGNI，留待后续）

## 技术约束

- 提醒仅在页面打开时生效（标签页关闭后无任何提醒）
- 逾期态是**渲染时实时计算**的，不是存储的字段
- 旧数据（无 dueTime 字段）需向后兼容

## 设计

### 一、数据结构扩展

`store.js` 的便签对象新增 3 个字段：

```js
{
  id, content, category, color, createdAt, updatedAt,
  // 新增 ↓
  dueTime: "2026-07-10T15:00" | null,   // 到期时间（选填，datetime-local 字符串）
  status: "pending" | "done",            // 处理状态：待处理 / 已处理（忽略）
  statusUpdatedAt: "2026-07-07T..."      // 状态变更时间
}
```

**字段说明：**

| 字段 | 类型 | 默认值 | 含义 |
|------|------|--------|------|
| `dueTime` | string \| null | null | 用户设定的到期时间；null 表示不参与提醒 |
| `status` | 'pending' \| 'done' | 'done'（无 dueTime 时）/ 'pending'（有 dueTime 时） | 是否待处理 |
| `statusUpdatedAt` | string \| null | null | 最近一次状态变更时间，用于审计 |

**旧数据兼容**：现有便签无这三个字段 → 渲染时当作 `dueTime=null`，不参与逾期判断，正常展示。

### 二、逾期判定逻辑（渲染时计算）

```js
function isOverdue(note) {
  return note.dueTime != null
      && note.status === 'pending'
      && new Date(note.dueTime) < new Date();
}
```

逾期不是存储字段，而是基于 `dueTime + status + 当前时间` 实时计算。

### 三、UI 设计

#### 1. 输入区：新增到期时间选择器

在现有「分类 / 颜色」选项旁，新增一个 `<input type="datetime-local" id="dueTimeInput">`。可留空。发布时：

- 填了 → 写入 `dueTime`，`status='pending'`
- 留空 → `dueTime=null`，`status='done'`

#### 2. 卡片视觉状态

| 状态 | 视觉表现 |
|------|---------|
| 无 dueTime | 维持现状 |
| 有 dueTime 未逾期 | 右上角小闹钟 ⏰ + 到期时间文字（如 "7/10 15:00"），普通色 |
| **已逾期未处理** | 红色边框 + ⚠️ 角标 + 到期时间文字标红 |
| 已逾期但已"忽略" | 恢复普通态，⏰ 变灰，到期时间文字变灰 |

#### 3. 卡片操作区新增按钮

- **逾期卡片**：hover 时出现「忽略」按钮（✓）→ 调用 `Store.setStatus(id, 'done')`
- **已忽略且当前逾期**：hover 时出现「重新标记」按钮（↩）→ 调用 `Store.setStatus(id, 'pending')`
- 普通卡片（无 dueTime 或未逾期）：不显示这两个按钮

### 四、定时检查机制

- 页面加载（`init`）时立即渲染一次（自动反映当前逾期态）
- 启动 `setInterval(checkOverdue, 60000)`，每 60 秒调用一次 `refresh()`
- `refresh()` 渲染时即时计算每条卡片的逾期态
- 不用 `setTimeout` 精确触发——这是"可视化"不是"通知"，60 秒粒度足够

### 五、文件改动点

| 文件 | 改动 |
|------|------|
| `js/store.js` | `addNote` 接收 `dueTime`；新增 `setStatus(id, status)` 方法 |
| `js/timeline.js` | 卡片渲染加 ⏰ 角标、到期时间、逾期高亮 class；导出 `isOverdue` 工具函数（或内联） |
| `js/app.js` | 输入区绑定 `dueTimeInput`；发布时传 `dueTime`；定时检查 `setInterval`；新增"忽略/重新标记"事件委托 |
| `index.html` | 输入区 `.composer-options` 内加到期时间选择器 |
| `css/style.css` | 逾期高亮样式（`.note-card.overdue`）、⏰ 角标样式、灰化样式 |

## 不动的部分

- 现有分类（日记/待办/想法）逻辑
- emoji 面板
- 导入 / 导出（自动包含新字段，无需特殊处理）
- 批量删除、框选（只按 id 操作，与 status 无关）
- 上一轮整理后的代码结构

## 验收清单

- [ ] 创建便签时不填到期时间 → 与原行为完全一致
- [ ] 创建便签时填到期时间（未来） → 卡片显示 ⏰ + 时间，未逾期常态
- [ ] 修改系统时间或等待到期 → 卡片变红边框 + ⚠️ 角标
- [ ] 点逾期卡片的「✓ 忽略」 → 卡片恢复正常色，⏰ 变灰
- [ ] 点已忽略卡片的「↩ 重新标记」 → 重新变红（因为仍逾期）
- [ ] 旧数据（无新字段的便签）正常展示，不报错
- [ ] 导出包含 dueTime/status 字段；导入后逾期判定正常
- [ ] 页面打开 60 秒后，新逾期的卡片自动变红（setInterval 生效）
- [ ] 批量删除、框选、emoji、搜索、筛选等现有功能不受影响
