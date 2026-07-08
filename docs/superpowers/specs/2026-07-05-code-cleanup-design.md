# 代码整理与去冗余 设计

> 日期：2026-07-05
> 主题：清理死代码、抽离 emoji 库、整理 app.js 结构

## 背景

项目经过多轮迭代（发布快捷键、导入导出、批量删除、框选、UI 调整），积累了一些死代码和结构碎片化问题。本次目标是**在不改变任何功能行为的前提下**，让代码更简洁、结构更清晰。

## 目标

- 删除无人调用的死代码
- 把硬编码的 emoji 库抽离到独立文件
- 整理 app.js 顶部结构（状态变量 / DOM 引用 / 工具函数分层）

## 非目标

- 不重命名变量、不调整函数顺序（除顶部结构整理）
- 不引入构建工具、模块系统、TypeScript
- 不改变任何交互行为
- 不重构 store.js / timeline.js 的核心逻辑

## 设计

### 一、删除死代码（零行为变化）

| 删除项 | 位置 | 原因 |
|--------|------|------|
| `Store.searchNotes()` 函数体 + return 中的导出 | `store.js:104-110, 118` | 全项目无调用，app.js 自己用 `filter` 实现搜索 |
| `Timeline.setCardSelected()` 函数体 + return 中的导出 | `timeline.js:189-196, 197` | 与 `toggleCardSelected` 功能完全重复，无人调用 |
| `applySelectionRect(rect, additive)` 的 `additive` 形参 | `timeline.js:174` | 函数体内未使用，调用方也未传 |

### 二、抽离 emoji 库

**新建 `js/emoji-data.js`：**

```js
/**
 * emoji 表情库（按分类组织）
 * 全局常量，供 app.js 的 emoji 面板使用
 */
const EMOJI_LIB = {
  '常用': [...],
  '心情': [...],
  '手势': [...],
  '日常': [...],
};
```

**`index.html` 调整：**

在 `app.js` 之前加载 emoji-data.js（依赖顺序：store → timeline → emoji-data → app）：

```html
<script src="js/store.js"></script>
<script src="js/timeline.js"></script>
<script src="js/emoji-data.js"></script>
<script src="js/app.js"></script>
```

**`app.js` 调整：**

- 删除内联的 `EMOJI_LIB` 定义（约 60 行）
- `initEmojiPanel()` 中的 `EMOJI_LIB` 引用改为读取全局（实际上变量名相同，代码不变，只是定义移走了）

### 三、整理 app.js 顶部结构

把散落在两处的 `getElementById` 调用合并到一处。整理后顶部区块顺序：

```
1. 状态变量
   - selectedColor, currentCategory, currentKeyword, selectedCategory
   - batchMode, selectedIds
   - 拖拽状态: dragging, dragStartX/Y, dragMoved, justDragged, dragAdditive

2. DOM 引用（一次性集中获取）
   - noteInput, submitBtn, searchInput, filterBar, timelineEl
   - categoryTabs, colorPicker, emojiTrigger, emojiPanel
   - exportBtn, importBtn, importFile
   - batchBtn, batchBar, checkAll, batchCount, batchDeleteBtn, batchDoneBtn
   - selectionBox

3. 工具函数
   - initEmojiPanel, insertAtCursor
   - getVisibleNotes, refresh

4. 业务函数
   - handleSubmit, handleSaveEdit, handleDelete
   - handleExport, handleImportClick, handleImportFile
   - updateBatchUI, enterBatchMode, exitBatchMode
   - toggleSelect, toggleSelectAll, handleBatchDelete
   - syncSelectedIdsFromDom, handleMouseDown, handleMouseMove, handleMouseUp

5. bindEvents

6. init
```

## 验收清单

- [ ] 浏览器打开后，所有功能与重构前完全一致：
  - 发布、编辑、删除、搜索、筛选、emoji、导出导入、批量删除、框选
- [ ] `node --check` 通过：store.js、timeline.js、emoji-data.js、app.js
- [ ] `grep -rn "searchNotes\|setCardSelected"` 返回空
- [ ] app.js 行数明显减少（emoji 库 60+ 行移走）
- [ ] emoji 面板点击插入功能正常（验证抽离后全局常量可用）
