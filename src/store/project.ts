import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
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
  
  // 历史系统的核心状态
  let lastCheckpointContent = ''
  const isSessionActive = ref(false) // 是否处于连续编辑会话中
  const historyDebounceTimer = ref<any>(null)

  const lastSavedBundle = ref<string>('')
  const uiStore = useUIStore()
  const historyStore = useHistoryStore()

  const currentProject = computed(() => bundle.value?.project || null)
  const isLoaded = computed(() => bundle.value !== null)

  function createProject(title: string) {
    bundle.value = BundleManager.createNewProject(title)
    lastSavedBundle.value = BundleManager.serialize(bundle.value)
    isDirty.value = false
    historyStore.clear()
    // 建立初始历史检查点
    takeSnapshot()
  }

  async function openProject(path: string) {
    try {
      isRestoring.value = true
      const { content } = await fsProvider.readFile(path)
      const success = await loadProjectContent(content, path)
      if (success && bundle.value) {
        uiStore.addRecentFile(bundle.value.project.title, path, 'project')
      }
      return success
    } catch (e) {
      isRestoring.value = false
      console.error('Failed to open project:', e)
      uiStore.showToast('无法打开项目文件', 'error')
      return false
    }
  }

  /**
   * 直接从字符串内容加载项目（用于 Web 端的拖拽或导入）
   */
  async function loadProjectContent(content: string, path?: string) {
    try {
      isRestoring.value = true
      bundle.value = BundleManager.deserialize(content)
      if (path) {
        bundle.value.project.path = path
        uiStore.addRecentFile(bundle.value.project.title, path, 'project')
      }
      
      lastSavedBundle.value = BundleManager.serialize(bundle.value)
      isDirty.value = false
      historyStore.clear()
      takeSnapshot()
      
      setTimeout(() => {
        isRestoring.value = false
      }, 500)
      
      return true
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
      lastSavedBundle.value = content
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
        lastSavedBundle.value = content
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
  }

  function updateHierarchies(hierarchies: any[]) {
    if (bundle.value) {
      takeSnapshot()
      bundle.value.project.hierarchies = hierarchies
      markDirty()
    }
  }

  /**
   * 核心：记录当前状态为一个历史检查点
   */
  function takeSnapshot() {
    if (!bundle.value || isRestoring.value) return
    
    // 只有在数据真正发生变化时才记录
    const success = historyStore.pushState(bundle.value, uiStore.viewMode)
    if (success) {
      console.log('[History] 记录检查点成功')
      lastCheckpointContent = JSON.stringify(bundle.value)
    }
  }

  /**
   * 开启一个编辑会话（如：开始打字、开始拖拽）
   * 逻辑：在会话的第一笔变动前，存下之前的状态
   */
  function startEditSession() {
    // 如果正在恢复历史记录或已锁步，严禁开启新会话
    if (isRestoring.value || isSessionActive.value) return
    
    console.log('[History] 开启编辑会话，存入初始快照')
    takeSnapshot()
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
    
    if (historyDebounceTimer.value) {
      clearTimeout(historyDebounceTimer.value)
      historyDebounceTimer.value = null
    }
  }

  /**
   * 专门用于文字编辑的节流
   */
  function triggerTextChange() {
    if (isRestoring.value) return
    
    // 如果还没开启会话，开启它（正常情况下 MonacoEditor 会处理，此处作为二层保险）
    if (!isSessionActive.value) {
      startEditSession()
    }

    // 自动重置结束计时器
    if (historyDebounceTimer.value) clearTimeout(historyDebounceTimer.value)
    historyDebounceTimer.value = setTimeout(() => {
      endEditSession()
    }, 2000) 
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
    lastCheckpointContent,
    createProject,
    openProject,
    loadProjectContent,
    saveProject,
    saveProjectAs,
    updateHierarchies,
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
