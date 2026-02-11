import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ViewMode, EditMode } from '@/types'
import { STORAGE_KEYS } from '@/config'

export interface Toast {
  id: number
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  duration?: number
}

export type ModalId = string

export const useUIStore = defineStore('ui', () => {
  // --- 导航与模式 (从 AppStore 合并) ---
  const viewMode = ref<ViewMode>('source')
  const editMode = ref<EditMode>('edit')
  const isLoading = ref(false)
  const loadingMessage = ref('正在加载...')
  const loadingProgress = ref(0)

  const recentFiles = ref<{ name: string, path?: string, date: number, type: 'txt' | 'project' }[]>([])

  // 编辑器状态同步 (用于 AI 引用等)
  const editorSelection = ref<{ startLine: number, endLine: number, text: string } | null>(null)

  function startLoading(message = '正在加载...') {
    isLoading.value = true
    loadingMessage.value = message
    loadingProgress.value = 0
  }

  function updateLoadingProgress(progress: number, message?: string) {
    loadingProgress.value = progress
    if (message) loadingMessage.value = message
  }

  function stopLoading() {
    isLoading.value = false
    loadingMessage.value = ''
    loadingProgress.value = 0
  }

  // 弹窗状态中心化管理
  const activeModals = ref<Record<string, any>>({})

  function openModal(id: ModalId, options: any = true) {
    activeModals.value[id] = options
  }

  function closeModal(id: ModalId) {
    delete activeModals.value[id]
  }

  function isModalOpen(id: ModalId) {
    return !!activeModals.value[id]
  }

  function getModalOptions(id: ModalId) {
    return activeModals.value[id]
  }

  const exportFormat = ref<'txt' | 'md'>('txt')
  
  // --- 持久化方法 ---
  function loadRecentFiles() {
    const saved = localStorage.getItem(STORAGE_KEYS.RECENT_FILES)
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
    localStorage.setItem(STORAGE_KEYS.RECENT_FILES, JSON.stringify(recentFiles.value))
  }

  function removeRecentFile(name: string, path?: string) {
    const existing = recentFiles.value.findIndex(f => f.name === name && f.path === path)
    if (existing !== -1) {
      recentFiles.value.splice(existing, 1)
      localStorage.setItem(STORAGE_KEYS.RECENT_FILES, JSON.stringify(recentFiles.value))
    }
  }

  function clearRecentFiles() {
    recentFiles.value = []
    localStorage.removeItem(STORAGE_KEYS.RECENT_FILES)
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
    loadingMessage,
    loadingProgress,
    startLoading,
    updateLoadingProgress,
    stopLoading,
    recentFiles,
    editorSelection,
    loadRecentFiles,
    addRecentFile,
    removeRecentFile,
    clearRecentFiles,
    switchViewMode,
    switchEditMode,
    // 弹窗
    activeModals,
    openModal,
    closeModal,
    isModalOpen,
    getModalOptions,
    exportFormat,
    toasts,
    showToast,
    removeToast,
    confirmState,
    showConfirm,
    handleConfirm
  }
})
