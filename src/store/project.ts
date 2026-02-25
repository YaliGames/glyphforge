import { defineStore } from 'pinia'
import { ref, computed, nextTick } from 'vue'
import type { GlyphForgeBundle } from '@/types'
import { BundleManager } from '@/core/bundleManager'
import { fsProvider } from '@/core/bridge'
import { APP_CONFIG } from '@/config'
import { useUIStore } from './ui'
import { useHistoryStore } from './history'

export const useProjectStore = defineStore('project', () => {
  const bundle = ref<GlyphForgeBundle | null>(null)
  const isDirty = ref(false)
  const isRestoring = ref(false)

  let pendingSessionSnapshot: string | null = null 

  const isSessionActive = ref(false) // 是否处于连续编辑会话中

  const uiStore = useUIStore()
  const historyStore = useHistoryStore()

  const getTitleFromPath = (path: string) => {
    const parts = path.split(/[/\\]/);
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.[^/.]+$/, "");
  };

  const currentProject = computed(() => bundle.value?.project || null)
  const isLoaded = computed(() => bundle.value !== null)

  function createProject(title: string) {
    bundle.value = BundleManager.createNewProject(title)
    isDirty.value = false
    historyStore.clear()
  }

  async function parseProjectBuffer(data: Uint8Array): Promise<GlyphForgeBundle> {
    let worker: Worker | null = null;
    try {
      uiStore.updateLoadingProgress(30, '正在解析数据...');
      
      return await new Promise<GlyphForgeBundle>((resolve, reject) => {
        worker = new Worker(new URL('@/worker/jsonParser.worker.ts', import.meta.url), { type: 'module' });
        
        worker.onmessage = (e) => {
          if (e.data.type === 'success') {
            uiStore.updateLoadingProgress(80, '校验数据完整性...');
            setTimeout(() => {
              resolve(e.data.payload);
            }, 100);
          } else {
            reject(new Error(e.data.error));
          }
        };
        
        worker.onerror = (err) => reject(err);
        
        worker.postMessage({ type: 'parse', payload: data }, [data.buffer]);
      });
    } finally {
      if (worker) {
        (worker as Worker).terminate();
      }
    }
  }

  async function openProject(path: string) {
    try {
      isRestoring.value = true
      uiStore.startLoading('正在读取项目文件...')

      const { data } = await fsProvider.readBuffer(path)
      
      const bundleData = await parseProjectBuffer(data)
      
      const success = await loadProjectBundle(bundleData, path);
      
      if (success && bundle.value) {
        const fileTitle = getTitleFromPath(path);
        uiStore.addRecentFile(fileTitle, path)
      }
      return success
    } catch (e) {
      isRestoring.value = false
      console.error('Failed to open project:', e)
      uiStore.showToast('无法打开项目文件', 'error')
      return false
    } finally {
      uiStore.stopLoading();
    }
  }

  async function openProjectFromBuffer(data: Uint8Array, path?: string) {
    try {
      isRestoring.value = true
      uiStore.startLoading('正在解析项目数据...')
      
      const bundleData = await parseProjectBuffer(data)
      const success = await loadProjectBundle(bundleData, path)
      
      if (success && bundle.value && path) {
        const fileTitle = getTitleFromPath(path);
        uiStore.addRecentFile(fileTitle, path)
      }
      return success
    } catch (e) {
      isRestoring.value = false
      console.error('Failed to open project from buffer:', e)
      uiStore.showToast('无法打开项目文件', 'error')
      return false
    } finally {
      uiStore.stopLoading()
    }
  }

  /**
   * Internal: Load from parsed Bundle object
   */
  async function loadProjectBundle(data: GlyphForgeBundle, path?: string) {
    try {
      uiStore.updateLoadingProgress(90, '初始化编辑器...')
      BundleManager.normalize(data)
      
      bundle.value = data
      if (path) {
        bundle.value.project.path = path
      }
      
      isDirty.value = false
      historyStore.clear()
      await nextTick()
      
      setTimeout(() => {
        isRestoring.value = false
      }, 500)
      
      return true;
    } catch (e) {
      console.error('Failed to load bundle:', e);
      return false;
    }
  }

  async function loadProjectContent(content: string, path?: string) {
    try {
      isRestoring.value = true
      const bundleData = BundleManager.deserialize(content)
      const success = await loadProjectBundle(bundleData, path)
      
      if (success && bundle.value && path) {
        uiStore.addRecentFile(bundle.value.project.title, path)
      }
      return success
    } catch (e) {
      isRestoring.value = false
      console.error('Failed to parse project content:', e)
      uiStore.showToast('项目解析或加载失败', 'error')
      return false
    }
  }

  async function saveProject() {
    if (!bundle.value || !bundle.value.project.path) return false

    try {
      const content = BundleManager.serialize(bundle.value)
      await fsProvider.writeFile(bundle.value.project.path, content)
      isDirty.value = false
      uiStore.showToast('项目已保存', 'success')
      return true
    } catch (e) {
      console.error('Failed to save project:', e)
      uiStore.showToast('保存失败', 'error')
      return false
    }
  }

  async function saveProjectAs() {
    if (!bundle.value) return false

    try {
      const content = BundleManager.serialize(bundle.value)
      const defaultName = (bundle.value.project.title || 'project') + APP_CONFIG.projectExtension
      const savedPath = await fsProvider.saveAs(content, defaultName)
      
      if (savedPath) {
        bundle.value.project.path = savedPath
        const fileTitle = getTitleFromPath(savedPath);
        
        isDirty.value = false
        uiStore.addRecentFile(fileTitle, savedPath)
        uiStore.showToast('项目已另存为', 'success')
        return true
      }
      return false
    } catch (e) {
      console.error('Save as failed:', e)
      uiStore.showToast('存储失败', 'error')
      return false
    }
  }

  function markDirty() {
    isDirty.value = true
  }

  /**
   * 记录一个全局快照点。用于非编辑器操作（如重命名章节、调整大纲结构）
   */
  function takeSnapshot() {
    if (!bundle.value || isRestoring.value || isSessionActive.value) return
    historyStore.pushState(bundle.value)
  }

  /**
   * 开启连续编辑会话。
   * 开始时记录当前 bundle 状态，以便在结束时对比差异。
   */
  function startEditSession() {
    if (isRestoring.value || isSessionActive.value || !bundle.value) return
    
    pendingSessionSnapshot = JSON.stringify({ bundle: bundle.value })
    isSessionActive.value = true
  }

  /**
   * 结束编辑会话。
   * 对比当前 bundle 与会话开始时的差异。如有变更，则将“开始前”的状态推入撤销栈。
   */
  function endEditSession() {
    if (!isSessionActive.value) return
    
    isSessionActive.value = false
    
    if (pendingSessionSnapshot && !isRestoring.value) {
      const currentState = JSON.stringify({ bundle: bundle.value })
      
      // 仅当实质性内容发生改变，且与最近一次快照不同时，才记入撤销栈
      if (currentState !== pendingSessionSnapshot) {
        historyStore.pushRawState(pendingSessionSnapshot)
      }
    }
    
    pendingSessionSnapshot = null
  }

  const canUndo = computed(() => historyStore.canUndo)
  const canRedo = computed(() => historyStore.canRedo)

  /**
   * 全局同步信号。编辑器监听此信号，在撤销/重做前强制同步文字。
   */
  const syncSignalCounter = ref(0)
  function requestGlobalSync() {
    syncSignalCounter.value++
  }

  function undo() {
    if (!bundle.value || isRestoring.value) return
    
    // 发送同步信号，确保当前编辑器（如果有）中的最新文字已同步回 Store
    requestGlobalSync()
    
    // 设置恢复锁，防止后续连锁反应触发异常快照
    isRestoring.value = true
    
    // 如果处于会话中，先结束它。由于上面已触发同步，此处 endEditSession 会带上最新文字
    if (isSessionActive.value) {
      endEditSession()
    }

    const prevState = historyStore.undo(bundle.value)
    if (prevState) {
      bundle.value = prevState.bundle
      isDirty.value = true
    }
    
    // 延迟更久一些释放锁，确保 Vue 渲染周期完成
    setTimeout(() => { 
      isRestoring.value = false 
    }, 200)
  }

  function redo() {
    if (!bundle.value || isRestoring.value) return
    
    requestGlobalSync()
    isRestoring.value = true
    
    if (isSessionActive.value) {
      endEditSession()
    }

    const nextState = historyStore.redo(bundle.value)
    if (nextState) {
      bundle.value = nextState.bundle
      isDirty.value = true
    }
    
    setTimeout(() => { 
      isRestoring.value = false 
    }, 200)
  }

  function finishRestoring() {
    isRestoring.value = false
  }

  return {
    bundle,
    currentProject,
    isLoaded,
    isDirty,
    isRestoring,
    isSessionActive,
    canUndo,
    canRedo,
    syncSignalCounter,
    createProject,
    openProject,
    openProjectFromBuffer,
    loadProjectContent,
    saveProject,
    saveProjectAs,
    markDirty,
    takeSnapshot,
    startEditSession,
    endEditSession,
    undo,
    redo,
    finishRestoring
  }
})