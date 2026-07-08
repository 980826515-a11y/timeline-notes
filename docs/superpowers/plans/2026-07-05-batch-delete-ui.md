# 批量删除 UI 优化 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把批量管理入口从顶栏移到筛选栏右侧（改名"批量删除"），退出按钮文案改为「✕ 取消」，并增加 ESC 退出和入口 toggle 退出。

**Architecture:** 纯前端 HTML/CSS/JS 改动。HTML 调整按钮位置和文案；CSS 加入口按钮样式和高亮态；JS 把入口按钮事件改为 toggle、加 ESC 监听、三种退出途径共用 `exitBatchMode()`。框选/卡片选择/store 逻辑不动。

**Tech Stack:** 原生 HTML + CSS + JavaScript（零依赖）

---

## 文件结构

| 文件 | 责任 | 改动类型 |
|------|------|---------|
| `index.html` | 页面结构 | 删顶栏批量按钮；筛选栏加入口；操作栏改文案 |
| `css/style.css` | 样式 | 加 `.batch-entry` + 高亮态；筛选栏 flex 布局调整 |
| `js/app.js` | 交互逻辑 | 入口 toggle、ESC 监听、`enterBatchMode`/`exitBatchMode` 改高亮控制 |

不动：`js/store.js`、`js/timeline.js`、框选逻辑、卡片选择逻辑。

---

## Task 1: HTML 调整 — 移动入口、改文案

**Files:**
- Modify: `index.html:20`（删除顶栏批量按钮）
- Modify: `index.html:48-54`（筛选栏加入口按钮）
- Modify: `index.html:69`（操作栏"完成"改"取消"）

- [ ] **Step 1: 删除顶栏的批量管理按钮**

把 `index.html:20` 这一行删除：
```html
        <button type="button" class="tool-btn" id="batchBtn" title="进入批量管理模式">☑️ 批量管理</button>
```

删除后顶栏的 `.toolbar-actions` 应只剩：
```html
      <div class="toolbar-actions">
        <button type="button" class="tool-btn" id="exportBtn" title="导出全部便签为 JSON 文件">⬇️ 导出</button>
        <button type="button" class="tool-btn" id="importBtn" title="从 JSON 文件导入便签">⬆️ 导入</button>
        <input type="file" id="importFile" accept="application/json,.json" hidden />
      </div>
```

- [ ] **Step 2: 改造筛选栏，把入口按钮放进右侧**

把 `index.html:48-54` 原筛选栏：
```html
    <!-- 分类筛选 -->
    <nav class="filters" id="filterBar">
      <button class="filter-btn active" data-category="全部">全部</button>
      <button class="filter-btn" data-category="日记">日记</button>
      <button class="filter-btn" data-category="待办">待办</button>
      <button class="filter-btn" data-category="想法">想法</button>
    </nav>
```

改为（在 `</nav>` 前加一个 `.filter-actions` 容器，里面放批量删除入口）：
```html
    <!-- 分类筛选 -->
    <nav class="filters" id="filterBar">
      <button class="filter-btn active" data-category="全部">全部</button>
      <button class="filter-btn" data-category="日记">日记</button>
      <button class="filter-btn" data-category="待办">待办</button>
      <button class="filter-btn" data-category="想法">想法</button>
      <div class="filter-actions">
        <button type="button" class="batch-entry" id="batchBtn" title="进入批量删除模式">🗑️ 批量删除</button>
      </div>
    </nav>
```

- [ ] **Step 3: 操作栏"完成"改"取消"**

把 `index.html:69`：
```html
      <button type="button" class="tool-btn" id="batchDoneBtn">完成</button>
```
改为：
```html
      <button type="button" class="tool-btn" id="batchDoneBtn">✕ 取消</button>
```

- [ ] **Step 4: 浏览器打开 index.html，确认**
- 顶栏只剩「导出」「导入」两个按钮
- 筛选栏右侧出现「🗑️ 批量删除」入口
- 操作栏（先看不到，可暂时在 DevTools 把 `#batchBar` 的 `hidden` 去掉验证）右端显示「✕ 取消」

- [ ] **Step 5: 提交**

```bash
git add index.html
git commit -m "ui: 移动批量删除入口到筛选栏，改文案"
```

> 注：项目不是 git 仓库（README 标注零依赖纯前端），如未初始化 git，此步可跳过，全部完成后一次性提交。

---

## Task 2: CSS — 入口按钮样式与高亮态

**Files:**
- Modify: `css/style.css:293-297`（筛选栏 flex 布局调整）
- Modify: `css/style.css`（在筛选栏样式块后新增 `.batch-entry` 样式）

- [ ] **Step 1: 调整筛选栏布局，让入口贴右**

把 `css/style.css:293-297` 原 `.filters` 规则：
```css
.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
```
改为（加 `align-items: center` 让按钮垂直居中；`.filter-actions` 用 `margin-left: auto` 推到最右）：
```css
.filters {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}
```

- [ ] **Step 2: 新增 `.batch-entry` 样式与高亮态**

在 `.filter-btn.active { ... }` 规则之后（约 `css/style.css:320` 附近）插入：
```css
/* 批量删除入口按钮（贴在筛选栏右侧） */
.batch-entry {
  padding: 5px 16px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--card-bg);
  color: var(--text-light);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.batch-entry:hover {
  border-color: var(--primary);
  color: var(--primary);
}

/* 进入批量模式后高亮激活态 */
.batch-entry.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
```

- [ ] **Step 3: 浏览器刷新，确认**
- 「🗑️ 批量删除」按钮在筛选栏最右侧，与筛选标签同高（胶囊形）
- 鼠标悬浮时变蓝（描边+字色）
- 暂时在 DevTools 给 `#batchBtn` 加 class `active`，确认变蓝填充

- [ ] **Step 4: 提交**

```bash
git add css/style.css
git commit -m "style: 批量删除入口按钮样式与高亮态"
```

---

## Task 3: JS — 入口 toggle、ESC 监听、退出逻辑统一

**Files:**
- Modify: `js/app.js:205-225`（`enterBatchMode`/`exitBatchMode` 改用高亮 class 替代 disabled）
- Modify: `js/app.js:361-365`（事件绑定：入口改 toggle、加 ESC）
- Modify: `js/app.js:66`（DOM 引用：`batchBtn` 现在指向新入口，无需改 id，引用保留）

- [ ] **Step 1: 改 `enterBatchMode` — 用高亮 class 替代 disabled**

把 `js/app.js:207-214`：
```js
  function enterBatchMode() {
    batchMode = true;
    selectedIds.clear();
    batchBar.hidden = false;
    batchBtn.disabled = true;
    timelineEl.classList.add('batch-active');
    Timeline.enterBatchMode();
    updateBatchUI();
  }
```
改为（`disabled = true` 换成 `classList.add('active')` 高亮）：
```js
  function enterBatchMode() {
    batchMode = true;
    selectedIds.clear();
    batchBar.hidden = false;
    batchBtn.classList.add('active');
    timelineEl.classList.add('batch-active');
    Timeline.enterBatchMode();
    updateBatchUI();
  }
```

- [ ] **Step 2: 改 `exitBatchMode` — 移除高亮**

把 `js/app.js:217-225`：
```js
  function exitBatchMode() {
    batchMode = false;
    selectedIds.clear();
    batchBar.hidden = true;
    batchBtn.disabled = false;
    checkAll.checked = false;
    timelineEl.classList.remove('batch-active');
    Timeline.exitBatchMode();
  }
```
改为（`disabled = false` 换成 `classList.remove('active')`）：
```js
  function exitBatchMode() {
    batchMode = false;
    selectedIds.clear();
    batchBar.hidden = true;
    batchBtn.classList.remove('active');
    checkAll.checked = false;
    timelineEl.classList.remove('batch-active');
    Timeline.exitBatchMode();
  }
```

- [ ] **Step 3: 入口按钮事件改为 toggle（进/退同一按钮）**

把 `js/app.js:362`：
```js
    batchBtn.addEventListener('click', enterBatchMode);
```
改为：
```js
    batchBtn.addEventListener('click', () => {
      if (batchMode) exitBatchMode();
      else enterBatchMode();
    });
```

- [ ] **Step 4: 加 ESC 键退出监听**

在 `js/app.js:365`（`checkAll` 那行监听之后）新增：
```js
    // ESC 退出批量模式
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && batchMode) exitBatchMode();
    });
```

- [ ] **Step 5: 语法检查**

运行：
```bash
node --check js/app.js
```
预期输出：`（无输出，表示语法正确）`，且命令退出码 0。

- [ ] **Step 6: 提交**

```bash
git add js/app.js
git commit -m "feat: 批量删除入口 toggle、ESC 退出、统一退出逻辑"
```

---

## Task 4: 手工验收

**Files:** 无（纯验收）

- [ ] **Step 1: 准备数据**

打开 `index.html`，写 3-5 条便签（混合日记/待办/想法分类）。

- [ ] **Step 2: 验收入口位置与样式**

- 「🗑️ 批量删除」按钮出现在筛选栏右侧，与「全部/日记/待办/想法」同行同高
- 顶栏只剩「导出」「导入」

- [ ] **Step 3: 验收进入/退出**

| 操作 | 预期 |
|------|------|
| 点「批量删除」 | 按钮变蓝高亮；下方出现操作栏（全选/已选/删除选中/✕ 取消） |
| 点「✕ 取消」 | 退出批量模式，按钮恢复灰色，操作栏消失 |
| 再点「批量删除」进入后，按 ESC | 退出批量模式 |
| 再进入后，再点一次「批量删除」高亮按钮 | 退出批量模式（toggle 生效） |

- [ ] **Step 4: 验收核心功能不回归**

- 进入批量模式后，拖拽框选 → 卡片选中高亮、计数更新正常
- 单击卡片 → 切换选中
- 全选 → 当前可见便签全选
- 「删除选中」→ 二次确认 → 删除成功并自动退出批量模式
- 退出批量模式后，普通模式下点卡片的 ✏️ 编辑、🗑️ 删除正常

- [ ] **Step 5: 验收响应式（窗口缩到 < 600px）**

- 筛选栏 wrap 后入口仍可见（可能换行到下方）
- 操作栏按钮不溢出

---

## 自查清单（写完计划后）

- [x] **Spec 覆盖**：入口移位（Task 1）、改名批量删除（Task 1）、取消文案（Task 1）、入口高亮（Task 2+3）、ESC 退出（Task 3）、独立成行操作栏（已存在，Task 1 仅改文案）—— 全覆盖
- [x] **占位符扫描**：无 TBD/TODO，每个步骤都有具体代码
- [x] **命名一致性**：`batchBtn`、`enterBatchMode`、`exitBatchMode`、`batchMode` 全程一致；CSS class `batch-entry` + `active` 一致
- [x] **id 不变**：`batchBtn` id 保留，只是从顶栏挪到筛选栏，JS 的 `getElementById('batchBtn')` 无需改
