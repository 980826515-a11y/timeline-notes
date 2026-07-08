/**
 * 应用入口：绑定事件、串联 Store 与 Timeline
 * 当前应用状态
 */
const App = (function () {
  // ===== 状态变量 =====
  let selectedColor = '#fff5cc';   // 当前选中的颜色（输入区）
  let currentKeyword = '';          // 当前搜索关键词
  let batchMode = false;            // 是否处于批量删除模式
  const selectedIds = new Set();    // 批量模式下已选中的便签 id

  // 拖拽框选状态（仅批量模式生效）
  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragMoved = false;            // 是否真的发生了拖动（区分点击）
  let justDragged = false;          // 拖动刚结束，用于抑制随之而来的 click 事件
  let dragAdditive = false;         // 本次拖拽是否为增量（Shift）

  // ===== DOM 引用 =====
  const noteInput = document.getElementById('noteInput');
  const submitBtn = document.getElementById('submitBtn');
  const searchInput = document.getElementById('searchInput');
  const filterBar = document.getElementById('filterBar');
  const timelineEl = document.getElementById('timeline');
  const colorPicker = document.getElementById('colorPicker');
  const emojiTrigger = document.getElementById('emojiTrigger');
  const emojiPanel = document.getElementById('emojiPanel');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  const batchBtn = document.getElementById('batchBtn');
  const batchBar = document.getElementById('batchBar');
  const checkAll = document.getElementById('checkAll');
  const batchCount = document.getElementById('batchCount');
  const batchDeleteBtn = document.getElementById('batchDeleteBtn');
  const batchDoneBtn = document.getElementById('batchDoneBtn');
  const selectionBox = document.getElementById('selectionBox');
  const dueTimeInput = document.getElementById('dueTimeInput');
  const dueClearBtn = document.getElementById('dueClearBtn');
  const dueTimeDisplay = document.getElementById('dueTimeDisplay');

  // ===== 工具函数 =====

  /** 初始化 emoji 面板内容（数据来自 emoji-data.js 的全局 EMOJI_LIB） */
  function initEmojiPanel() {
    let html = '';
    for (const [cat, list] of Object.entries(EMOJI_LIB)) {
      html += `<div class="emoji-cat-title">${cat}</div>`;
      html += '<div class="emoji-grid">';
      list.forEach((em) => {
        html += `<button type="button" class="emoji-item" data-emoji="${em}">${em}</button>`;
      });
      html += '</div>';
    }
    emojiPanel.innerHTML = html;
  }

  /** 在 textarea 光标处插入文本 */
  function insertAtCursor(text) {
    const start = noteInput.selectionStart;
    const end = noteInput.selectionEnd;
    noteInput.value = noteInput.value.slice(0, start) + text + noteInput.value.slice(end);
    const pos = start + text.length;
    noteInput.focus();
    noteInput.setSelectionRange(pos, pos);
  }

  /** 根据当前搜索条件获取要展示的便签 */
  function getVisibleNotes() {
    let notes = Store.getNotes();
    if (currentKeyword) {
      const kw = currentKeyword.toLowerCase();
      notes = notes.filter((n) => n.content.toLowerCase().includes(kw));
    }
    return notes;
  }

  /** 刷新时间轴 */
  function refresh() {
    Timeline.render(getVisibleNotes());
    if (batchMode) {
      // 重新渲染后恢复批量模式的可选状态
      Timeline.enterBatchMode();
      getVisibleNotes().forEach((n) => {
        if (selectedIds.has(n.id)) Timeline.toggleCardSelected(n.id, true);
      });
    }
  }

  /** 提交新便签 */
  function handleSubmit() {
    const content = noteInput.value.trim();
    if (!content) {
      noteInput.focus();
      return;
    }
    if (!dueTimeInput.value) {
      alert('请先选择到期时间');
      return;
    }
    Store.addNote({
      content,
      color: selectedColor,
      dueTime: dueTimeInput.value,
    });
    noteInput.value = '';
    dueTimeInput.value = '';
    dueClearBtn.hidden = true;
    updateDueTimeDisplay(null);
    refresh();
  }

  /** 格式化到期时间为简短显示（M/D HH:MM），跨年加"明年" */
  function formatDueTimeDisplay(isoStr) {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const isNextYear = date.getFullYear() > now.getFullYear();
    return `${m}/${d} ${hh}:${mm}${isNextYear ? ' · 明年' : ''}`;
  }

  /** 更新显示框文本 */
  function updateDueTimeDisplay(value) {
    const textEl = dueTimeDisplay.querySelector('.due-display-text');
    if (value) {
      textEl.textContent = formatDueTimeDisplay(value);
      dueTimeDisplay.classList.remove('placeholder');
    } else {
      textEl.textContent = '选择时间';
      dueTimeDisplay.classList.add('placeholder');
    }
  }

  /** 编辑保存回调 */
  function handleSaveEdit(id, payload) {
    Store.updateNote(id, payload);
    refresh();
  }

  /** 删除便签（带二次确认） */
  function handleDelete(id) {
    if (!confirm('确定删除这条便签吗？')) return;
    Store.deleteNote(id);
    refresh();
  }

  /** 忽略逾期便签（标记为已处理） */
  function handleDismiss(id) {
    Store.setStatus(id, 'done');
    refresh();
  }

  /** 重新标记已忽略的便签为待处理 */
  function handleRedismiss(id) {
    Store.setStatus(id, 'pending');
    refresh();
  }

  /** 导出：把当前全部便签下载为 JSON 文件 */
  function handleExport() {
    const notes = Store.getNotes();
    if (notes.length === 0) {
      alert('当前没有便签，无需导出');
      return;
    }
    const data = JSON.stringify(notes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `timeline-notes-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** 导入：点击后触发隐藏的文件选择框 */
  function handleImportClick() {
    importFile.value = ''; // 允许重复选择同一文件
    importFile.click();
  }

  /** 导入：解析文件并合并数据 */
  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      let imported;
      try {
        imported = JSON.parse(ev.target.result);
      } catch (err) {
        alert('文件解析失败，请选择正确的 JSON 备份文件');
        return;
      }
      if (!Array.isArray(imported)) {
        alert('文件格式不对，应为便签数组');
        return;
      }
      // 过滤掉缺少必要字段的脏数据
      const valid = imported.filter(
        (n) => n && typeof n === 'object' && n.id && n.content
      );
      if (valid.length === 0) {
        alert('文件里没有有效的便签数据');
        return;
      }
      const existing = Store.getNotes();
      const existIds = new Set(existing.map((n) => n.id));
      // 合并：已存在的 id 跳过，避免覆盖
      const merged = existing.concat(
        valid.filter((n) => !existIds.has(n.id))
      );
      const addCount = merged.length - existing.length;
      Store.replaceAll(merged);
      refresh();
      alert(`导入完成：新增 ${addCount} 条，跳过重复 ${valid.length - addCount} 条`);
    };
    reader.onerror = () => alert('读取文件失败，请重试');
    reader.readAsText(file);
  }

  /** 刷新批量操作栏的计数和按钮可用状态 */
  function updateBatchUI() {
    const count = selectedIds.size;
    batchCount.textContent = `已选 ${count} 条`;
    batchDeleteBtn.disabled = count === 0;
    // 全选框状态：当前可见便签全部选中则打勾
    const visible = getVisibleNotes();
    checkAll.checked =
      visible.length > 0 && visible.every((n) => selectedIds.has(n.id));
  }

  /** 进入批量模式 */
  function enterBatchMode() {
    batchMode = true;
    selectedIds.clear();
    batchBar.hidden = false;
    batchBtn.classList.add('active');
    timelineEl.classList.add('batch-active');
    Timeline.enterBatchMode();
    updateBatchUI();
  }

  /** 退出批量模式 */
  function exitBatchMode() {
    batchMode = false;
    selectedIds.clear();
    batchBar.hidden = true;
    batchBtn.classList.remove('active');
    checkAll.checked = false;
    timelineEl.classList.remove('batch-active');
    Timeline.exitBatchMode();
  }

  /** 切换单条便签选中态 */
  function toggleSelect(id) {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    Timeline.toggleCardSelected(id, selectedIds.has(id));
    updateBatchUI();
  }

  /** 全选 / 取消全选（作用于当前可见便签） */
  function toggleSelectAll(checked) {
    const visible = getVisibleNotes();
    visible.forEach((n) => {
      if (checked) selectedIds.add(n.id);
      else selectedIds.delete(n.id);
      Timeline.toggleCardSelected(n.id, checked);
    });
    updateBatchUI();
  }

  /** 批量删除选中的便签 */
  function handleBatchDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`确定删除选中的 ${ids.length} 条便签吗？此操作不可撤销。`)) return;
    const removed = Store.deleteMany(ids);
    exitBatchMode();
    refresh();
    alert(`已删除 ${removed} 条`);
  }

  // ===== 拖拽框选（仅批量模式生效） =====

  /** 把选中的 id 同步到 selectedIds 集合 */
  function syncSelectedIdsFromDom() {
    selectedIds.clear();
    document
      .querySelectorAll('.note-card.selected')
      .forEach((card) => selectedIds.add(card.dataset.id));
    updateBatchUI();
  }

  /** 鼠标按下：批量模式下，在时间轴任意位置按下都进入"待拖拽"状态 */
  function handleMouseDown(e) {
    if (!batchMode) return;
    if (e.button !== 0) return;
    // 必须在时间轴区域内
    if (!timelineEl.contains(e.target)) return;

    dragging = true;
    dragMoved = false;
    dragAdditive = e.shiftKey;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    // 阻止文本选中
    e.preventDefault();
  }

  /** 鼠标移动：更新选区框，并刷新扫过的卡片选中态 */
  function handleMouseMove(e) {
    if (!dragging) return;
    const x = e.clientX;
    const y = e.clientY;
    const dx = Math.abs(x - dragStartX);
    const dy = Math.abs(y - dragStartY);
    // 移动超过阈值才算拖动，避免纯点击被误判
    if (!dragMoved && dx < 4 && dy < 4) return;
    // 第一次跨过阈值时：非 Shift 模式清空之前的选择
    if (!dragMoved) {
      dragMoved = true;
      if (!dragAdditive) {
        selectedIds.forEach((id) => Timeline.toggleCardSelected(id, false));
        selectedIds.clear();
        updateBatchUI();
      }
    }

    const left = Math.min(x, dragStartX);
    const top = Math.min(y, dragStartY);
    const width = Math.max(dx, 1);
    const height = Math.max(dy, 1);
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
    selectionBox.style.display = 'block';

    const rect = { left, top, right: left + width, bottom: top + height };
    Timeline.applySelectionRect(rect);
    syncSelectedIdsFromDom();
  }

  /** 鼠标松开：结束框选，隐藏选区框 */
  function handleMouseUp() {
    if (!dragging) return;
    dragging = false;
    selectionBox.style.display = 'none';
    if (dragMoved) justDragged = true; // 抑制接下来的 click
    dragMoved = false;
  }

  /** 事件绑定 */
  function bindEvents() {
    // emoji 开关 + 点击插入
    emojiTrigger.addEventListener('click', () => {
      emojiPanel.hidden = !emojiPanel.hidden;
    });
    emojiPanel.addEventListener('click', (e) => {
      const item = e.target.closest('.emoji-item');
      if (!item) return;
      insertAtCursor(item.dataset.emoji);
      emojiPanel.hidden = true;
    });
    // 点外面关闭 emoji 面板
    document.addEventListener('click', (e) => {
      if (emojiPanel.hidden) return;
      if (!emojiPanel.contains(e.target) && e.target !== emojiTrigger) {
        emojiPanel.hidden = true;
      }
    });

    // 发布按钮
    submitBtn.addEventListener('click', handleSubmit);

    // 导出 / 导入
    exportBtn.addEventListener('click', handleExport);
    importBtn.addEventListener('click', handleImportClick);
    importFile.addEventListener('change', handleImportFile);

    // 批量删除：入口 toggle（进/退同一按钮）
    batchBtn.addEventListener('click', () => {
      if (batchMode) exitBatchMode();
      else enterBatchMode();
    });
    batchDoneBtn.addEventListener('click', exitBatchMode);
    batchDeleteBtn.addEventListener('click', handleBatchDelete);
    checkAll.addEventListener('change', (e) => toggleSelectAll(e.target.checked));

    // ESC 退出批量模式
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && batchMode) exitBatchMode();
    });

    // 输入框快捷发布：Enter 发布，Shift+Enter 换行
    noteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        handleSubmit();
      }
    });

    // 颜色选择
    colorPicker.addEventListener('click', (e) => {
      const dot = e.target.closest('.color-dot');
      if (!dot) return;
      selectedColor = dot.dataset.color;
      colorPicker
        .querySelectorAll('.color-dot')
        .forEach((d) => d.classList.remove('active'));
      dot.classList.add('active');
    });

    // 到期时间：点显示框弹出滑轮选择器
    dueTimeDisplay.addEventListener('click', () => {
      DateTimePicker.open({
        value: dueTimeInput.value || null,
        onConfirm: (value) => {
          dueTimeInput.value = value;
          dueClearBtn.hidden = false;
          updateDueTimeDisplay(value);
        },
      });
    });
    // 清除到期时间
    dueClearBtn.addEventListener('click', () => {
      dueTimeInput.value = '';
      dueClearBtn.hidden = true;
      updateDueTimeDisplay(null);
    });

    // 搜索（实时）
    let searchTimer = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        currentKeyword = e.target.value.trim();
        refresh();
      }, 200);
    });

    // 时间轴事件委托：批量模式下走选择，普通模式走编辑 / 删除
    timelineEl.addEventListener('click', (e) => {
      // 刚发生过框选拖动时，忽略随之而来的 click，避免误触发选择切换
      if (e.target.closest('.note-card') && justDragged) {
        justDragged = false;
        return;
      }
      const card = e.target.closest('.note-card');
      if (!card) return;
      const id = card.dataset.id;

      // 批量模式：点卡片或选择框都触发选中切换
      if (batchMode) {
        toggleSelect(id);
        return;
      }

      const editBtn = e.target.closest('.btn-edit');
      const deleteBtn = e.target.closest('.btn-delete');
      const dismissBtn = e.target.closest('.btn-dismiss');
      const redismissBtn = e.target.closest('.btn-redismiss');
      if (editBtn) {
        const note = Store.getNotes().find((n) => n.id === id);
        if (note) {
          Timeline.enterEditMode(
            note,
            handleSaveEdit,
            refresh // 取消 = 直接重新渲染还原
          );
        }
      } else if (deleteBtn) {
        handleDelete(deleteBtn.dataset.id);
      } else if (dismissBtn) {
        handleDismiss(dismissBtn.dataset.id);
      } else if (redismissBtn) {
        handleRedismiss(redismissBtn.dataset.id);
      }
    });

    // 拖拽框选：按下绑定在时间轴，移动/松开绑定在 document（避免拖出元素失效）
    timelineEl.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  /** 初始化 */
  function init() {
    initEmojiPanel();
    bindEvents();
    refresh();
    // 每 60 秒检查一次逾期状态，刷新视图
    setInterval(refresh, 60000);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
