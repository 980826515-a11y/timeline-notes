/**
 * iOS 式滑轮日期时间选择器
 * 4 列：月 / 日 / 时 / 分（分只列 5 的倍数）
 * 不暴露年份，跨年自动判定（今年/明年）
 *
 * 用法：
 *   DateTimePicker.open({
 *     value: '2026-07-10T15:30',  // 初始值（可选）
 *     onConfirm: (value) => {},
 *     onCancel: () => {}
 *   });
 */
const DateTimePicker = (function () {
  const ITEM_HEIGHT = 40;      // 每项高度（px）
  const VISIBLE_COUNT = 5;     // 可见行数
  const HALF = Math.floor(VISIBLE_COUNT / 2); // 高亮行索引（第 3 行，0-based=2）

  /** 生成某范围的整数数组：range(1, 12) -> [1..12] */
  function range(start, end) {
    const arr = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }

  /** 根据年/月获取当月天数 */
  function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  /** 生成分钟选项（5 的倍数） */
  function minuteOptions() {
    return range(0, 11).map((i) => i * 5);
  }

  /**
   * 滚轮列：管理单列的滚动、吸附、选中态
   */
  function createColumn(options, initialValue) {
    const wrapper = document.createElement('div');
    wrapper.className = 'picker-column';

    const list = document.createElement('div');
    list.className = 'picker-list';

    // 渲染所有项
    const items = options.map((val) => {
      const item = document.createElement('div');
      item.className = 'picker-item';
      item.dataset.value = val;
      item.textContent = String(val).padStart(2, '0');
      list.appendChild(item);
      return item;
    });
    wrapper.appendChild(list);

    // 中间高亮区上下边界线（用伪元素也行，这里用 DOM 便于复用变量）
    const highlight = document.createElement('div');
    highlight.className = 'picker-highlight';
    wrapper.appendChild(highlight);

    let currentIndex = Math.max(0, options.indexOf(initialValue));
    let isDragging = false;
    let startY = 0;
    let startOffset = 0;
    let currentOffset = 0;
    let wheelTimer = null;

    /** 应用位移 */
    function applyOffset(offset, animated) {
      currentOffset = offset;
      list.style.transition = animated ? 'transform 0.25s ease-out' : 'none';
      list.style.transform = `translateY(${offset}px)`;
      updateFade();
    }

    /** 根据当前位移计算最近的项索引并吸附 */
    function snap(animate) {
      // list 中心要对齐 wrapper 中心
      // wrapper 高度 = VISIBLE_COUNT * ITEM_HEIGHT
      // 中心位置（相对 list 顶部）= HALF * ITEM_HEIGHT + ITEM_HEIGHT/2
      // 第 i 项的中心在 i * ITEM_HEIGHT + ITEM_HEIGHT/2
      // 要让 currentIndex 项的中心对齐 wrapper 中心：
      //   offset = HALF * ITEM_HEIGHT - currentIndex * ITEM_HEIGHT
      const base = HALF * ITEM_HEIGHT;
      const idx = Math.round((base - currentOffset) / ITEM_HEIGHT);
      currentIndex = Math.max(0, Math.min(options.length - 1, idx));
      const targetOffset = base - currentIndex * ITEM_HEIGHT;
      applyOffset(targetOffset, animate);
    }

    /** 更新上下淡出效果（基于距中心行的距离） */
    function updateFade() {
      items.forEach((item, i) => {
        const dist = Math.abs(i - currentIndex);
        // 距离 0:不透明；1:0.6；2:0.3；>2:0.1
        const opacity = dist === 0 ? 1 : dist === 1 ? 0.6 : dist === 2 ? 0.3 : 0.1;
        item.style.opacity = opacity;
      });
    }

    /** 获取当前选中值 */
    function getValue() {
      return options[currentIndex];
    }

    /** 设置当前值（外部联动日列时用） */
    function setValue(val, animate) {
      const idx = options.indexOf(val);
      if (idx === -1) return;
      currentIndex = idx;
      const targetOffset = HALF * ITEM_HEIGHT - currentIndex * ITEM_HEIGHT;
      applyOffset(targetOffset, animate);
    }

    // 滚轮事件
    wrapper.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ITEM_HEIGHT : ITEM_HEIGHT;
      applyOffset(currentOffset + delta, false);
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => snap(true), 100);
    }, { passive: false });

    // 拖拽事件（pointer）
    wrapper.addEventListener('pointerdown', (e) => {
      isDragging = true;
      startY = e.clientY;
      startOffset = currentOffset;
      list.style.transition = 'none';
      wrapper.setPointerCapture(e.pointerId);
    });
    wrapper.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dy = e.clientY - startY;
      applyOffset(startOffset + dy, false);
    });
    wrapper.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      snap(true);
    });
    wrapper.addEventListener('pointercancel', () => {
      if (isDragging) {
        isDragging = false;
        snap(true);
      }
    });

    // 点击项跳转
    items.forEach((item, i) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        currentIndex = i;
        applyOffset(HALF * ITEM_HEIGHT - currentIndex * ITEM_HEIGHT, true);
      });
    });

    // 初始化位置
    applyOffset(HALF * ITEM_HEIGHT - currentIndex * ITEM_HEIGHT, false);

    return { element: wrapper, getValue, setValue };
  }

  /**
   * 打开模态选择器
   * @param {Object} opts { value?, onConfirm, onCancel? }
   */
  function open(opts) {
    opts = opts || {};

    // 每次打开默认为当前时间
    const now = new Date();
    const thisYear = now.getFullYear();
    const initYear = thisYear;
    const initMonth = now.getMonth() + 1;
    const initDay = now.getDate();
    const initHour = now.getHours();
    const initMinute = now.getMinutes();

    // 创建遮罩 + 卡片
    const overlay = document.createElement('div');
    overlay.className = 'dtp-overlay';

    const card = document.createElement('div');
    card.className = 'dtp-card';

    // 标题
    const title = document.createElement('div');
    title.className = 'dtp-title';
    title.textContent = '选择到期时间';
    card.appendChild(title);

    // 滑轮容器
    const wheel = document.createElement('div');
    wheel.className = 'dtp-wheel';

    // 列标题：年 / 月 / 日 / 时 / 分（与下方 5 列对齐）
    const headers = document.createElement('div');
    headers.className = 'dtp-headers';
    ['年', '月', '日', '时', '分'].forEach((label) => {
      const h = document.createElement('div');
      h.className = 'dtp-header';
      h.textContent = label;
      headers.appendChild(h);
    });
    card.appendChild(headers);
    card.appendChild(wheel);

    // 当前列对应的年份（用于日列天数计算，由年份列驱动）
    // 年份列：当前年 ± 5，共 11 项
    const yearOptions = range(thisYear - 5, thisYear + 5);
    const yearCol = createColumn(yearOptions, initYear);
    let activeYear = initYear;

    // 创建各列
    const monthCol = createColumn(range(1, 12), initMonth);
    const hourCol = createColumn(range(0, 23), initHour);
    const minuteCol = createColumn(minuteOptions(), initMinute);

    // 日列依赖月/年，需动态重建
    function buildDayCol(day) {
      const m = monthCol.getValue();
      const maxDay = daysInMonth(activeYear, m);
      const options = range(1, maxDay);
      const col = createColumn(options, Math.min(day, maxDay));
      return col;
    }
    let dayCol = buildDayCol(initDay);

    // 重新计算年份（从年份列读取）并联动日列
    function refreshYear() {
      activeYear = yearCol.getValue();
      // 年份变化可能导致日列天数变化，重建
      const currentDay = dayCol.getValue();
      const maxDay = daysInMonth(activeYear, monthCol.getValue());
      if (currentDay > maxDay) {
        // 当前日超出新月的天数，替换日列
        const newDayCol = buildDayCol(maxDay);
        wheel.replaceChild(newDayCol.element, dayCol.element);
        dayCol = newDayCol;
      }
    }

    wheel.appendChild(yearCol.element);
    wheel.appendChild(monthCol.element);
    wheel.appendChild(dayCol.element);
    wheel.appendChild(hourCol.element);
    wheel.appendChild(minuteCol.element);

    // 操作按钮
    const actions = document.createElement('div');
    actions.className = 'dtp-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'dtp-btn dtp-btn-cancel';
    cancelBtn.textContent = '取消';
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'dtp-btn dtp-btn-confirm';
    confirmBtn.textContent = '确认';
    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    card.appendChild(actions);

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // 阻止遮罩点击穿透
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });

    // 月列变化时重建日列（轮询监听不好，改用事件委托：监听 wheel 内的 click/pointerup）
    // 简化：在每次 wheel 交互后检查日列是否需要重建
    wheel.addEventListener('pointerup', () => {
      setTimeout(rebuildDayIfNeeded, 280); // 等吸附动画结束
    });
    wheel.addEventListener('wheel', () => {
      setTimeout(rebuildDayIfNeeded, 120);
    });

    function rebuildDayIfNeeded() {
      const m = monthCol.getValue();
      const maxDay = daysInMonth(activeYear, m);
      const currentDay = dayCol.getValue();
      if (currentDay > maxDay) {
        const newDayCol = buildDayCol(maxDay);
        wheel.replaceChild(newDayCol.element, dayCol.element);
        dayCol = newDayCol;
      }
      refreshYear();
    }

    function close(confirmed) {
      if (confirmed) {
        refreshYear();
        const y = yearCol.getValue();
        const m = monthCol.getValue();
        const d = dayCol.getValue();
        const h = hourCol.getValue();
        const min = minuteCol.getValue();
        const pad = (n) => String(n).padStart(2, '0');
        const value = `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}`;
        document.body.removeChild(overlay);
        if (typeof opts.onConfirm === 'function') opts.onConfirm(value);
      } else {
        document.body.removeChild(overlay);
        if (typeof opts.onCancel === 'function') opts.onCancel();
      }
    }

    confirmBtn.addEventListener('click', () => close(true));
    cancelBtn.addEventListener('click', () => close(false));

    // ESC 取消
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escHandler);
        close(false);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  return { open };
})();
