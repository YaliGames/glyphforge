import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { execSync } from 'child_process'

// 获取 Git 信息
const getGitInfo = () => {
  try {
    const commitHash = execSync('git rev-parse --short HEAD').toString().trim()
    const branchName = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
    const commitDate = execSync('git log -1 --format=%cd --date=format:"%Y-%m-%d %H:%M:%S"').toString().trim()
    return { commitHash, branchName, commitDate }
  } catch (e) {
    return { commitHash: 'unknown', branchName: 'unknown', commitDate: 'unknown' }
  }
}

const gitInfo = getGitInfo()

const formatDate = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __GIT_COMMIT__: JSON.stringify(gitInfo.commitHash),
    __GIT_BRANCH__: JSON.stringify(gitInfo.branchName),
    __GIT_DATE__: JSON.stringify(gitInfo.commitDate),
    __BUILD_TIME__: JSON.stringify(formatDate(new Date())),
  },
  plugins: [
    vue(),
    (monacoEditorPlugin as any).default({
      languageWorkers: ['editorWorkerService']
    }),
    electron([
      {
        // Main-Process entry file of the Electron App.
        entry: 'electron/main.ts',
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete, 
          // instead of restarting the entire Electron App.
          options.reload()
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
