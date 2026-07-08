# 📝 时间轴便签（网页版）

零依赖的纯前端版本，双击 `index.html` 即可使用。

## 使用方法

直接双击 `index.html`，用任意浏览器打开即可。

## 功能

- 📝 记录便签，设定到期时间
- ⏰ 逾期红框高亮提醒
- 🎨 iOS 式滑轮选时间（分钟只列 5 的倍数）
- ✏️ 编辑、🗑️ 批量删除、🔍 搜索
- 📤 导出 / 📥 导入 JSON 备份

## 数据存储

数据存在浏览器的 `localStorage`，绑定当前浏览器。

⚠️ 换浏览器、清浏览器数据会丢失，建议定期用「导出」备份。

## 文件结构

```
html-version/
├── index.html           页面入口
├── css/style.css        样式
└── js/
    ├── store.js         数据层（localStorage）
    ├── timeline.js      时间轴渲染
    ├── app.js           应用入口
    ├── emoji-data.js    emoji 表情库
    └── datetime-picker.js  滑轮时间选择器
```
