# 📝 时间轴便签 (Timeline Notes)

带到期提醒的桌面便签应用。提供两种使用方式：

| 版本 | 位置 | 适用场景 |
|------|------|---------|
| 🌐 **网页版** | [`html-version/`](html-version/) | 双击 HTML 即用，零安装 |
| 🖥️ **桌面版** | 根目录（Tauri/Electron 打包） | 打包成 exe，给非技术用户 |

## 网页版（推荐先试）

进入 [`html-version/`](html-version/) 目录，双击 `index.html` 即可。

详见 [html-version/README.md](html-version/README.md)。

## 功能特性

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

## 桌面版打包

桌面版打包说明见 [docs/RELEASE.md](docs/RELEASE.md)。

## 技术栈

- 前端：原生 HTML + CSS + JavaScript，零依赖
- 桌面壳：Tauri 2（Rust）/ Electron 22
