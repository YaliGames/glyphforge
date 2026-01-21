import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 默认支持的项目后缀名，保持与 APP_CONFIG 同步
const DEFAULT_PROJECT_EXT = '.gfp';

let mainWindow: BrowserWindow | null = null;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();

            const filePath = commandLine.find(arg => arg.endsWith(DEFAULT_PROJECT_EXT) || arg.endsWith('.txt'));
            if (filePath) {
                mainWindow.webContents.send('open-file-request', filePath);
            }
        }
    });

    async function createWindow() {
        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 900,
            minHeight: 600,
            frame: false,
            titleBarStyle: 'hidden',
            backgroundColor: '#ffffff',
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false
            },
        });

        // 拦截原生关闭事件（如 Alt+F4）
        mainWindow.on('close', (e) => {
            if (mainWindow) {
                e.preventDefault();
                mainWindow.webContents.send('request-close');
            }
        });

        if (process.env.VITE_DEV_SERVER_URL) {
            await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
            mainWindow.webContents.openDevTools();
        } else {
            await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
        }

        const filePath = process.argv.find(arg => arg.endsWith(DEFAULT_PROJECT_EXT) || arg.endsWith('.txt'));
        if (filePath) {
            mainWindow.webContents.on('did-finish-load', () => {
                mainWindow?.webContents.send('open-file-request', filePath);
            });
        }
    }

    app.whenReady().then(() => {
        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });

    ipcMain.handle('read-file', async (_event: any, filePath: string) => {
        const buffer = await fs.readFile(filePath);
        return {
            data: new Uint8Array(buffer),
            name: path.basename(filePath),
            path: filePath
        };
    });

    ipcMain.handle('write-file', async (_event: any, filePath: string, content: string) => {
        await fs.writeFile(filePath, content, 'utf-8');
    });

    ipcMain.handle('show-open-dialog', async (_event: any, options: any) => {
        const result = await dialog.showOpenDialog(mainWindow!, options);
        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            const buffer = await fs.readFile(filePath);
            return {
                data: new Uint8Array(buffer),
                name: path.basename(filePath),
                path: filePath
            };
        }
        return null;
    });

    ipcMain.handle('show-save-dialog', async (_event: any, options: any) => {
        const result = await dialog.showSaveDialog(mainWindow!, options);
        return result;
    });

    ipcMain.on('minimize-window', () => mainWindow?.minimize());
    ipcMain.on('maximize-window', () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow?.maximize();
        }
    });
    ipcMain.on('close-window', () => {
        if (mainWindow) {
            mainWindow.webContents.send('request-close');
        }
    });

    ipcMain.on('force-close', () => {
        mainWindow?.destroy();
    });

    ipcMain.on('toggle-fullscreen', () => {
        if (mainWindow) {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
        }
    });
    ipcMain.on('toggle-devtools', () => {
        if (mainWindow?.webContents.isDevToolsOpened()) {
            mainWindow.webContents.closeDevTools();
        } else {
            mainWindow?.webContents.openDevTools();
        }
    });
    ipcMain.on('quit-app', () => app.quit());
    ipcMain.on('open-external', (_event, url) => {
        shell.openExternal(url);
    });
}
