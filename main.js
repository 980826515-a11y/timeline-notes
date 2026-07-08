// Electron 主进程入口
// 创建应用窗口、加载前端页面
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// 隐藏默认菜单栏（便签应用不需要文件/编辑等菜单）
Menu.setApplicationMenu(null);

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 900,
    minWidth: 480,
    minHeight: 600,
    title: '时间轴便签',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      // 预设：禁用 Node 集成，启用上下文隔离，安全第一
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 加载前端页面
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Electron 准备就绪后创建窗口
app.whenReady().then(createWindow);

// macOS: 点击 dock 图标时，若没有窗口则重新创建
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// 所有窗口关闭时退出应用（除 macOS 外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
