# 打包发布说明

本项目使用 Tauri 打包成桌面应用，通过 GitHub Actions 自动构建 Windows 安装包。

## 项目结构

```
timeline-notes/
├── src/                    前端文件（HTML/CSS/JS，应用本体）
├── src-tauri/              Tauri 后端（Rust 壳 + 配置）
│   ├── src/main.rs         Rust 入口
│   ├── src/lib.rs          应用启动逻辑
│   ├── Cargo.toml          Rust 依赖配置
│   ├── tauri.conf.json     Tauri 应用配置（窗口、图标、应用名）
│   └── icons/              应用图标（自动生成）
├── package.json            npm 配置（Tauri CLI）
└── .github/workflows/      GitHub Actions 配置
    └── release.yml         Windows 自动构建
```

## 本地开发

### 环境要求

- Node.js 18+
- Rust 工具链（`rustup`）
- 首次需配置 Rust 国内镜像（见下文）

### 启动开发模式

```bash
npm install
npm run dev
```

会启动 Tauri 开发窗口，自动热重载前端代码。

## 发布 Windows 安装包

### 步骤

1. **提交所有改动并推送**：

   ```bash
   git add .
   git commit -m "你的提交信息"
   git push
   ```

2. **打 tag 触发构建**：

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **等待 GitHub Actions 构建完成**：
   - 打开 GitHub 仓库页面 → Actions 标签
   - 构建约需 10-15 分钟（首次更慢）
   - 构建成功后，在 Releases 页面会出现 `.exe` 和 `.msi` 安装包下载链接

4. **下载安装包，发给用户**：
   - `.exe`（NSIS 安装器）：双击安装，推荐
   - `.msi`：Windows 标准安装包

### 用户安装

最终用户收到 `.exe` 后：
1. 双击运行
2. 按提示安装（Windows 可能提示"未知发布者"，点"仍要运行"）
3. 安装完成后，开始菜单/桌面出现"时间轴便签"
4. 双击图标启动，数据存在本地

**用户无需安装任何运行时**——Tauri 使用系统自带的 WebView2（Windows 10/11 默认包含）。

## Rust 国内镜像配置（首次开发用）

如果 `cargo check` / `npm run dev` 很慢，配置清华镜像：

```bash
mkdir -p ~/.cargo
cat > ~/.cargo/config.toml << 'EOF'
[source.crates-io]
replace-with = "tuna"

[source.tuna]
registry = "sparse+https://mirrors.tuna.tsinghua.edu.cn/crates.io-index/"

[net]
git-fetch-with-cli = true
EOF
```

## 修改应用信息

编辑 `src-tauri/tauri.conf.json`：
- `productName`：应用显示名
- `version`：版本号
- `windows[0]`：窗口标题、尺寸
- `bundle.shortDescription` / `longDescription`：应用描述

## 替换应用图标

1. 准备一张 1024×1024 的 PNG 源图
2. 运行：`npx tauri icon 你的源图.png`
3. 自动生成所有尺寸到 `src-tauri/icons/`
