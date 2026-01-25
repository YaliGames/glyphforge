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
  const historyDebounceTimer = ref<any>(null)

  const uiStore = useUIStore()
  const historyStore = useHistoryStore()

  const currentProject = computed(() => bundle.value?.project || null)
  const isLoaded = computed(() => bundle.value !== null)

  function createProject(title: string) {
    bundle.value = BundleManager.createNewProject(title)
    isDirty.value = false
    historyStore.clear()
    // 建立初始历史检查点
    takeSnapshot()
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
        uiStore.addRecentFile(bundle.value.project.title, path, 'project')
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
        uiStore.addRecentFile(bundle.value.project.title, path, 'project')
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
      takeSnapshot()
      
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
        uiStore.addRecentFile(bundle.value.project.title, path, 'project')
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
        isDirty.value = false
        uiStore.addRecentFile(bundle.value.project.title, savedPath, 'project')
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

    // 如果处于编辑会话中且有挂起的快照（说明是会话内的第一次变动），立即将其提交到历史栈
    if (isSessionActive.value && pendingSessionSnapshot) {
      console.log('[History] 会话内首次变动，提交挂起的初始快照')
      historyStore.pushRawState(pendingSessionSnapshot)
      pendingSessionSnapshot = null // 提交后清除，避免重复提交
    }
  }

  /**
   * 核心：记录当前状态为一个历史检查点
   */
  function takeSnapshot() {
    // 如果正在恢复，或处于编辑会话中（会话开始时已记录），则不记录中间状态
    if (!bundle.value || isRestoring.value || isSessionActive.value) return
    
    // 只有在数据真正发生变化时才记录
    const success = historyStore.pushState(bundle.value, uiStore.viewMode)
    if (success) {
      console.log('[History] 记录检查点成功')
    }
  }

  /**
   * 开启一个编辑会话（如：开始打字、开始拖拽）
   * 逻辑：暂存当前状态，但不立即推入历史栈（Lazy Snapshot）。只有当数据真正被修改时（触发 markDirty）才推入。
   */
  function startEditSession() {
    // 如果正在恢复历史记录或已锁步，严禁开启新会话
    if (isRestoring.value || isSessionActive.value) return
    if (!bundle.value) return
    
    console.log('[History] 开启编辑会话，挂起初始快照')
    
    // 暂存状态，不立即入栈
    pendingSessionSnapshot = JSON.stringify({ bundle: bundle.value, view: uiStore.viewMode })
    isSessionActive.value = true
  }

  /**
   * 结束一个编辑会话（如：停止打字 2 秒、失去焦点）
   * @param saveCheckpoint 是否在结束时自动存入一个检查点 (移除此处的主动快照逻辑)
   */
  function endEditSession() {
    if (!isSessionActive.value) return
    
    console.log(`[History] 结束编辑会话`)
    isSessionActive.value = false
    pendingSessionSnapshot = null // 会话结束，清除未提交的快照（说明此次会话无修改）
    
    if (historyDebounceTimer.value) {
      clearTimeout(historyDebounceTimer.value)
      historyDebounceTimer.value = null
    }
  }

  /**
   * 专门用于文字编辑的节流
   * @param delay 结束会话的延迟毫秒数，默认为 1000ms
   */
  function triggerTextChange(delay = 1000) {
    if (isRestoring.value) return
    
    // 如果还没开启会话，开启它（正常情况下 MonacoEditor 会处理，此处作为二层保险）
    if (!isSessionActive.value) {
      startEditSession()
    }

    // 自动重置结束计时器
    if (historyDebounceTimer.value) clearTimeout(historyDebounceTimer.value)
    historyDebounceTimer.value = setTimeout(() => {
      endEditSession()
    }, delay) 
  }

  const canUndo = computed(() => historyStore.canUndo)
  const canRedo = computed(() => historyStore.canRedo)

  function undo() {
    if (!bundle.value || isRestoring.value) return
    
    console.log('[History] 请求撤销')
    
    // 关键修复：先设恢复锁，防止后续 endEditSession 或 reactive 变更触发快照
    isRestoring.value = true
    
    if (isSessionActive.value) {
      endEditSession()
    }

    const prevState = historyStore.undo(bundle.value, uiStore.viewMode)
    
    if (prevState) {
      bundle.value = prevState.bundle
      uiStore.switchViewMode(prevState.view as any)
      isDirty.value = true
    }
    
    // 延迟更久一些释放锁，给浏览器反应事件和 Vue 渲染留足缓冲
    setTimeout(() => { 
      isRestoring.value = false 
      console.log('[History] 恢复锁已释放')
    }, 200)
  }

  function redo() {
    if (!bundle.value || isRestoring.value) return
    
    console.log('[History] 请求重做')
    isRestoring.value = true
    
    if (isSessionActive.value) {
      endEditSession()
    }

    const nextState = historyStore.redo(bundle.value, uiStore.viewMode)
    
    if (nextState) {
      bundle.value = nextState.bundle
      uiStore.switchViewMode(nextState.view as any)
      isDirty.value = true
    }
    
    setTimeout(() => { 
      isRestoring.value = false 
      console.log('[History] 恢复锁已释放')
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
    triggerTextChange,
    undo,
    redo,
    finishRestoring
  }
})
