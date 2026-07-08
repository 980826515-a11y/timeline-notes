/**
 * 时间轴渲染层：负责把便签数据按日期分组渲染到页面
 * 暴露全局对象 Timeline，由 app.js 调用
 */
const Timeline = (function () {
  const container = document.getElementById('timeline');
  const emptyState = document.getElementById('emptyState');

  /** 转义 HTML，防止注入 */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * 把日期格式化成"今天/昨天/本周X/具体日期"
   * @param {string} isoStr ISO 时间字符串
   * @returns {string} 分组标签
   */
  function formatDateGroup(isoStr) {
    const date = new Date(isoStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((today - target) / 86400000);

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays > 1 && diffDays < 7) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return '本周' + weekdays[date.getDay()];
    }
    // 更早：显示年月日
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}年${m}月${d}日`;
  }

  /** 把日期归一到"天"作为分组 key（YYYY-MM-DD） */
  function getDateKey(isoStr) {
    return (isoStr || '').slice(0, 10);
  }

  /** 格式化到期时间显示（M/D HH:MM），跨年加"· 明年"标签 */
  function formatDueTime(isoStr) {
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

  /** 格式化到期时间用于显示框（同 formatDueTime，语义化别名） */
  function formatDueTimeDisplay(isoStr) {
    return formatDueTime(isoStr);
  }

  /** 判断便签是否逾期（dueTime 已过且未处理） */
  function isOverdue(note) {
    return (
      note.dueTime != null &&
      note.status === 'pending' &&
      new Date(note.dueTime) < new Date()
    );
  }

  /** 生成单张便签卡片的 HTML */
  function noteCardHtml(note) {
    const edited =
      note.updatedAt && note.updatedAt !== note.createdAt ? '已编辑' : '';

    // 到期时间标记
    const hasDue = note.dueTime != null;
    const overdue = isOverdue(note);
    // 已忽略且当前仍逾期：标记为灰化的"已忽略"状态
    const dismissed = hasDue && note.status === 'done' && new Date(note.dueTime) < new Date();

    const dueClass = overdue ? 'due-overdue' : (dismissed ? 'due-dismissed' : 'due-normal');
    const dueBadge = hasDue
      ? `<span class="due-badge ${dueClass}">⏰ ${formatDueTime(note.dueTime)}</span>`
      : '';

    // 逾期角标 + 卡片高亮 class
    const overdueFlag = overdue ? '<span class="overdue-flag">⚠️</span>' : '';
    const overdueClass = overdue ? ' overdue' : '';

    // 忽略 / 重新标记 按钮
    let extraBtn = '';
    if (overdue) {
      extraBtn = `<button class="btn-dismiss" data-id="${note.id}" title="标记为已处理（忽略）">✓</button>`;
    } else if (dismissed) {
      extraBtn = `<button class="btn-redismiss" data-id="${note.id}" title="重新标记为待处理">↩</button>`;
    }

    return `
      <div class="note-card${overdueClass}" data-id="${note.id}" style="--note-color:${note.color}">
        ${overdueFlag}
        <input type="checkbox" class="note-checkbox" data-id="${note.id}" aria-label="选择此便签" />
        <div class="note-content">${escapeHtml(note.content)}</div>
        <div class="note-meta">
          <span class="note-edited">${edited}</span>
          <div class="note-meta-right">
            ${dueBadge}
            <div class="note-actions">
              ${extraBtn}
              <button class="btn-edit" data-id="${note.id}">✏️</button>
              <button class="btn-delete" data-id="${note.id}">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染整个时间轴
   * @param {Array} notes 便签数组（已排序）
   */
  function render(notes) {
    container.innerHTML = '';

    if (notes.length === 0) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    // 按"天"分组，保持倒序（最新日期在前）
    const groups = new Map();
    notes.forEach((note) => {
      const key = getDateKey(note.dueTime);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(note);
    });

    // 组装 HTML（一次性写入，减少回流）
    let html = '';
    for (const [key, groupNotes] of groups) {
      const label = formatDateGroup(groupNotes[0].dueTime);
      html += `<section class="date-group" data-date="${key}">`;
      html += `<div class="date-header">📅 ${label}</div>`;
      groupNotes.forEach((note) => {
        html += noteCardHtml(note);
      });
      html += `</section>`;
    }
    container.innerHTML = html;
  }

  /**
   * 把指定卡片切换为编辑态
   * @param {Object} note 待编辑的便签数据
   * @param {Function} onSave(id, payload) 保存回调，payload={content, dueTime}
   * @param {Function} onCancel 取消回调
   */
  function enterEditMode(note, onSave, onCancel) {
    const card = container.querySelector(`.note-card[data-id="${note.id}"]`);
    if (!card) return;
    card.classList.add('editing');
    // 编辑框内的到期时间用显示框 + 滑轮选择器
    const dueDisplay = formatDueTimeDisplay(note.dueTime) || '选择时间';
    card.innerHTML = `
      <textarea class="note-edit-area" rows="3">${escapeHtml(note.content)}</textarea>
      <div class="edit-due-row">
        <span class="edit-due-label">⏰ 到期</span>
        <div class="due-time-display edit-due-display ${note.dueTime ? '' : 'placeholder'}" data-value="${note.dueTime || ''}">
          <span class="due-display-icon">⏰</span>
          <span class="due-display-text">${dueDisplay}</span>
        </div>
      </div>
      <div class="edit-controls">
        <button class="btn-cancel">取消</button>
        <button class="btn-save">保存</button>
      </div>
    `;
    const textarea = card.querySelector('.note-edit-area');
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    // 编辑框显示框点击 → 弹出滑轮选择器
    card.querySelector('.edit-due-display').addEventListener('click', function () {
      const self = this;
      DateTimePicker.open({
        value: self.dataset.value || null,
        onConfirm: (value) => {
          self.dataset.value = value;
          self.querySelector('.due-display-text').textContent = formatDueTimeDisplay(value);
          self.classList.remove('placeholder');
        },
      });
    });

    card.querySelector('.btn-save').addEventListener('click', () => {
      const newContent = textarea.value.trim();
      const newDue = card.querySelector('.edit-due-display').dataset.value;
      if (!newContent) {
        onCancel();
        return;
      }
      if (!newDue) {
        alert('请选择到期时间');
        return;
      }
      onSave(note.id, { content: newContent, dueTime: newDue });
    });
    card.querySelector('.btn-cancel').addEventListener('click', onCancel);
  }

  /** 进入批量模式：所有卡片加上可选状态 */
  function enterBatchMode() {
    container.querySelectorAll('.note-card').forEach((card) => {
      card.classList.add('selectable');
      card.classList.remove('selected');
      const cb = card.querySelector('.note-checkbox');
      if (cb) cb.checked = false;
    });
  }

  /** 退出批量模式：清除所有选择状态 */
  function exitBatchMode() {
    container.querySelectorAll('.note-card').forEach((card) => {
      card.classList.remove('selectable', 'selected');
      const cb = card.querySelector('.note-checkbox');
      if (cb) cb.checked = false;
    });
  }

  /** 切换单张卡片的选中态 */
  function toggleCardSelected(id, selected) {
    const card = container.querySelector(`.note-card[data-id="${id}"]`);
    if (!card) return;
    card.classList.toggle('selected', selected);
    const cb = card.querySelector('.note-checkbox');
    if (cb) cb.checked = selected;
  }

  /**
   * 根据当前选区矩形，刷新所有可见卡片的选中态
   * @param {Object} rect 选区矩形 { left, top, right, bottom }（基于视口）
   */
  function applySelectionRect(rect) {
    const cards = container.querySelectorAll('.note-card.selectable');
    cards.forEach((card) => {
      const cardRect = card.getBoundingClientRect();
      const id = card.dataset.id;
      const intersects =
        rect.left < cardRect.right &&
        rect.right > cardRect.left &&
        rect.top < cardRect.bottom &&
        rect.bottom > cardRect.top;
      toggleCardSelected(id, intersects);
    });
  }

  return { render, enterEditMode, enterBatchMode, exitBatchMode, toggleCardSelected, applySelectionRect };
})();
