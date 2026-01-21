<template>
  <div>
    <!-- 关于弹窗 -->
    <Modal 
      :show="uiStore.showAboutModal" 
      title="关于 GlyphForge" 
      @close="uiStore.showAboutModal = false"
    >
      <div class="space-y-4 dark:text-gray-300 p-2">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-3xl shadow-lg">G</div>
          <div>
            <h3 class="text-xl font-bold dark:text-white">{{ APP_CONFIG.name }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">版本 {{ APP_CONFIG.version }}</p>
          </div>
        </div>
        <p class="text-sm leading-relaxed">
          GlyphForge 是一款专注于逻辑与结构的现代小说创作平台。
          通过将隐性认知显性化，帮助创作者在自由书写的同时保持逻辑的高一致性。
        </p>
        <div class="pt-4 border-t dark:border-[#333333] text-xs text-gray-500">
          © 2024-2026 GlyphForge Project Team
        </div>
      </div>
    </Modal>

    <!-- 首选项弹窗 -->
    <Modal 
      :show="uiStore.showSettingsModal" 
      title="首选项" 
      @close="uiStore.showSettingsModal = false"
    >
      <div class="space-y-6 p-2">
        <div class="space-y-4">
          <h4 class="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">外观</h4>
          <div class="flex items-center justify-between">
            <span class="text-sm dark:text-gray-400">深色模式</span>
            <button 
              @click="settingsStore.updateSetting('general.theme', settingsStore.isDarkMode ? 'off' : 'on')"
              class="w-10 h-5 rounded-full transition-colors relative"
              :class="settingsStore.isDarkMode ? 'bg-blue-600' : 'bg-gray-300'"
            >
              <div 
                class="absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform"
                :class="settingsStore.isDarkMode ? 'translate-x-5' : 'translate-x-0'"
              ></div>
            </button>
          </div>
        </div>
      </div>
    </Modal>
    
    <!-- 构建信息弹窗 -->
    <Modal 
      :show="uiStore.showBuildInfoModal" 
      title="构建信息" 
      @close="uiStore.showBuildInfoModal = false"
    >
      <div class="space-y-4 dark:text-gray-300 p-2 text-sm">
        <div class="grid grid-cols-2 gap-y-3">
          <div class="text-gray-500">应用版本</div><div class="font-mono">{{ APP_CONFIG.version }}</div>
          <div class="text-gray-500">平台</div><div class="font-mono">{{ platform }}</div>
          <div class="text-gray-500">分支</div><div class="font-mono">main</div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '@/store/ui'
import { useSettingsStore } from '@/store/settings'
import { APP_CONFIG } from '@/config/index'
import Modal from '@/components/common/Modal.vue'
import { isElectron } from '@/utils/env'

const uiStore = useUIStore()
const settingsStore = useSettingsStore()

const platform = computed(() => {
  if (!isElectron) return 'Web'
  return (window as any).electronAPI?.platform || 'Electron'
})
</script>
