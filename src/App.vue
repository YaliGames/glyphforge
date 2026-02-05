<template>
  <div class="w-full h-screen overflow-hidden flex flex-col bg-gray-50 dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 font-sans">
    <!-- 顶部标题栏 -->
    <TopBar />

    <LoadingOverlay />

    <!-- 主体区域 -->
    <main class="flex-1 overflow-hidden flex relative">
      <!-- 侧边导航活动栏 -->
      <ActivityBar />

      <!-- 内容视图区域 -->
      <div class="flex-1 overflow-hidden flex flex-col relative bg-white dark:bg-[#1e1e1e]">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </transition>
        </router-view>
      </div>
    </main>

    <!-- 底部状态栏 -->
    <StatusBar />

    <!-- 全局弹窗组件 -->
    <GlobalModals />

    <!-- AI 创作助手 (右侧抽屉) -->
    <AIAssistant v-if="settingsStore.getSettings()['ai.enabled']" />

    <!-- AI 请求调试工具 (左下角) -->
    <AIDebugger v-if="showAIDebugger" />

    <!-- 全局交互反馈 -->
    <Toast />
    <Confirm />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, computed } from 'vue'
import { useUIStore } from '@/store/ui'
import { useSettingsStore } from '@/store/settings'
import { getActionFromKey } from '@/utils/shortcuts'
import { useActions } from '@/composables/useActions'
import { isElectron } from '@/utils/env'
import TopBar from '@/components/layout/TopBar.vue'
import ActivityBar from '@/components/layout/ActivityBar.vue'
import StatusBar from '@/components/layout/StatusBar.vue'
import GlobalModals from '@/components/features/modals/GlobalModals.vue'
import AIAssistant from '@/components/features/ai/AIAssistant.vue'
import Toast from '@/components/common/Toast.vue'
import Confirm from '@/components/common/Confirm.vue'
import LoadingOverlay from '@/components/common/LoadingOverlay.vue'

// 调试工具
import AIDebugger from '@/components/features/ai/AIDebugger.vue'

const uiStore = useUIStore()
const settingsStore = useSettingsStore()
const { handleAction, ensureSaved } = useActions()

const showAIDebugger = computed(() => {
  return import.meta.env.VITE_ENABLE_AI_DEBUGGER === 'true'
})

// 监听深色模式变化
watch(() => settingsStore.isDarkMode, (isDark) => {
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}, { immediate: true })

// 全局快捷键处理
const handleGlobalKeyDown = (e: KeyboardEvent) => {
  const action = getActionFromKey(e)
  if (action) {
    // 检查当前焦点是否在输入控件中
    const target = e.target as HTMLElement
    const isEditing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

    // 如果用户正在输入框中编辑，让撤销/重做走原生逻辑，不进行拦截
    if (isEditing && (action === 'undo' || action === 'redo')) {
      return
    }

    e.preventDefault()
    handleAction(action)
  }
}

onMounted(() => {
  uiStore.loadRecentFiles()
  window.addEventListener('keydown', handleGlobalKeyDown)

  if (isElectron && (window as any).electronAPI) {
    const api = (window as any).electronAPI
    
    // 监听外部文件打开请求
    if (typeof api.onOpenFileRequest === 'function') {
      api.onOpenFileRequest((path: string) => {
        handleAction('open-project', path)
      })
    }

    // 监听窗口关闭请求
    if (typeof api.onRequestClose === 'function') {
      api.onRequestClose(async () => {
        if (await ensureSaved()) {
          api.forceClose?.()
        }
      })
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown)
})
</script>

<style>
/* 全局基础样式 */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  user-select: none;
}

/* 页面切换动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.1s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 滚动条美化 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 3px;
}

.dark ::-webkit-scrollbar-thumb {
  background: #333;
}

::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: #444;
}
</style>
