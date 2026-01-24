import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ViewMode, EditMode } from '@/types'

export interface Toast {
  id: number
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  duration?: number
}

export const useUIStore = defineStore('ui', () => {
  // --- 导航与模式 (从 AppStore 合并) ---
  const viewMode = ref<ViewMode>('source')
  const editMode = ref<EditMode>('edit')
  const isLoading = ref(false)
  const recentFiles = ref<{ name: string, path?: string, date: number, type: 'txt' | 'project' }[]>([])

  const showRecognitionModal = ref(false)
  const showFormattingPresetsModal = ref(false)
  const showSavePresetModal = ref(false)
  const showAboutModal = ref(false)
  const showLicenseModal = ref(false)
  const showBuildInfoModal = ref(false)
  const showSettingsModal = ref(false)
  const showExportProjectModal = ref(false)
  const showAIProfileModal = ref(false)
  const exportFormat = ref<'txt' | 'md'>('txt')
  
  // --- 持久化方法 ---
  function loadRecentFiles() {
    const saved = localStorage.getItem('glyphforge-recent-files')
    if (saved) {
      try { recentFiles.value = JSON.parse(saved) } catch (e) {}
    }
  }

  function addRecentFile(name: string, path?: string, type: 'txt' | 'project' = 'project') {
    const now = Date.now()
    const existing = recentFiles.value.findIndex(f => f.name === name && f.path === path)
    if (existing !== -1) {
      recentFiles.value.splice(existing, 1)
    }
    recentFiles.value.unshift({ name, path, date: now, type })
    recentFiles.value = recentFiles.value.slice(0, 10)
    localStorage.setItem('glyphforge-recent-files', JSON.stringify(recentFiles.value))
  }

  function clearRecentFiles() {
    recentFiles.value = []
    localStorage.removeItem('glyphforge-recent-files')
  }

  // --- 模式切换 ---
  function switchViewMode(mode: ViewMode) {
    if (viewMode.value === mode) return
    isLoading.value = true
    setTimeout(() => {
      viewMode.value = mode
      setTimeout(() => {
        isLoading.value = false
      }, 100)
    }, 50)
  }

  function switchEditMode(mode: EditMode) {
    if (editMode.value === mode) return
    isLoading.value = true
    setTimeout(() => {
      editMode.value = mode
      setTimeout(() => {
        isLoading.value = false
      }, 100)
    }, 50)
  }
  
  // Confirm 状态
  const confirmState = ref({
    show: false,
    title: '',
    message: '',
    confirmText: '确定',
    cancelText: '取消',
    extraText: '', // 新增：第三个按钮的文本
    type: 'info' as 'info' | 'warning' | 'danger' | 'success',
    resolve: (_value: any) => {}
  })

  const showConfirm = (options: {
    title?: string
    message: string
    confirmText?: string
    cancelText?: string
    extraText?: string // 新增
    type?: 'info' | 'warning' | 'danger' | 'success'
  }): Promise<boolean | 'extra'> => {
    return new Promise((resolve) => {
      confirmState.value = {
        show: true,
        title: options.title || '确认',
        message: options.message,
        confirmText: options.confirmText || '确定',
        cancelText: options.cancelText || '取消',
        extraText: options.extraText || '',
        type: options.type || 'info',
        resolve
      }
    })
  }

  const handleConfirm = (value: boolean | 'extra') => {
    confirmState.value.show = false
    confirmState.value.resolve(value)
  }

  // Toast 状态
  const toasts = ref<Toast[]>([])
  let toastIdCounter = 0

  const showToast = (message: string, type: Toast['type'] = 'info', duration = 3000) => {
    const id = ++toastIdCounter
    toasts.value.push({ id, message, type, duration })
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }

  const removeToast = (id: number) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  return {
    // 导航
    viewMode,
    editMode,
    isLoading,
    recentFiles,
    loadRecentFiles,
    addRecentFile,
    clearRecentFiles,
    switchViewMode,
    switchEditMode,
    // 弹窗
    showRecognitionModal,
    showFormattingPresetsModal,
    showSavePresetModal,
    showAboutModal,
    showLicenseModal,
    showBuildInfoModal,
    showSettingsModal,
    showExportProjectModal,
    showAIProfileModal,
    exportFormat,
    toasts,
    showToast,
    removeToast,
    confirmState,
    showConfirm,
    handleConfirm
  }
})
