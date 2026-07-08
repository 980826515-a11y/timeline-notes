/**
 * 数据层：封装 localStorage 的便签 CRUD 操作
 * 所有读写都经过这里，保持唯一数据入口
 */
const Store = (function () {
  const STORAGE_KEY = 'timeline-notes:data';

  /** 读取全部便签（按创建时间倒序） */
  function getNotes() {
    const raw = localStorage.getItem(STORAGE_KEY);
    let notes = [];
    try {
      notes = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('解析本地数据失败，已重置为空', e);
      notes = [];
    }
    // 按到期时间倒序：最新的在前（旧数据无 dueTime 时退回 createdAt，避免 NaN 混乱）
    return notes.sort((a, b) => {
      const ta = new Date(a.dueTime || a.createdAt).getTime();
      const tb = new Date(b.dueTime || b.createdAt).getTime();
      return tb - ta;
    });
  }

  /** 持久化便签数组 */
  function saveNotes(notes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }

  /** 生成唯一 id：时间戳 + 随机串 */
  function genId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  /**
   * 新增便签
   * @param {Object} payload { content, color, dueTime }
   * @returns {Object} 新建的便签对象
   */
  function addNote(payload) {
    const now = new Date().toISOString();
    const hasDue = payload.dueTime && payload.dueTime.trim();
    const note = {
      id: genId(),
      content: payload.content.trim(),
      color: payload.color || '#fff5cc',
      createdAt: now,
      updatedAt: now,
      dueTime: hasDue ? payload.dueTime.trim() : null,
      status: hasDue ? 'pending' : 'done',
      statusUpdatedAt: hasDue ? now : null,
    };
    const notes = getNotes();
    notes.push(note);
    saveNotes(notes);
    return note;
  }

  /**
   * 设置便签的处理状态（忽略 / 重新标记）
   * @param {string} id 便签 id
   * @param {'pending'|'done'} status
   * @returns {Object|null} 更新后的便签，找不到返回 null
   */
  function setStatus(id, status) {
    const notes = getNotes();
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) return null;
    notes[idx] = {
      ...notes[idx],
      status,
      statusUpdatedAt: new Date().toISOString(),
    };
    saveNotes(notes);
    return notes[idx];
  }

  /**
   * 更新便签
   * @param {string} id 便签 id
   * @param {Object} patch 待更新字段 { content?, category?, color? }
   * @returns {Object|null} 更新后的便签，找不到返回 null
   */
  function updateNote(id, patch) {
    const notes = getNotes();
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) return null;
    notes[idx] = {
      ...notes[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    saveNotes(notes);
    return notes[idx];
  }

  /**
   * 删除便签
   * @param {string} id 便签 id
   * @returns {boolean} 是否删除成功
   */
  function deleteNote(id) {
    const notes = getNotes();
    const next = notes.filter((n) => n.id !== id);
    if (next.length === notes.length) return false;
    saveNotes(next);
    return true;
  }

  /**
   * 批量删除便签（按 id 集合）
   * @param {Array<string>} ids 待删除的 id 数组
   * @returns {number} 实际删除条数
   */
  function deleteMany(ids) {
    const idSet = new Set(ids);
    const notes = getNotes();
    const next = notes.filter((n) => !idSet.has(n.id));
    const removed = notes.length - next.length;
    if (removed > 0) saveNotes(next);
    return removed;
  }

  /**
   * 用给定数组覆盖写入全部便签（导入用，需谨慎）
   * @param {Array} notes 完整便签数组
   */
  function replaceAll(notes) {
    saveNotes(Array.isArray(notes) ? notes : []);
  }

  return { getNotes, addNote, updateNote, deleteNote, deleteMany, replaceAll, setStatus };
})();
