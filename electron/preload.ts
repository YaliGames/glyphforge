import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('write-file', path, content),
  
  showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),
  forceClose: () => ipcRenderer.send('force-close'),
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  toggleDevTools: () => ipcRenderer.send('toggle-devtools'),
  quit: () => ipcRenderer.send('quit-app'),
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
  
  onOpenFileRequest: (callback: (filePath: string) => void) => {
    ipcRenderer.on('open-file-request', (_event, filePath) => callback(filePath));
  },
  onRequestClose: (callback: () => void) => {
    ipcRenderer.on('request-close', () => callback());
  },
  
  // AI 网络请求桥接
  aiRequest: (endpoint: string, options: any) => ipcRenderer.invoke('ai-request', endpoint, options),
  aiAbort: () => ipcRenderer.send('ai-abort'),
  
  // 流式请求监听
  onAIChunk: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('ai-chunk', listener);
    return () => ipcRenderer.removeListener('ai-chunk', listener);
  },

  // 调试日志监听
  onAIDebug: (callback: (data: any) => void) => {
    ipcRenderer.on('ai-debug', (_event, data) => callback(data));
  }
});
