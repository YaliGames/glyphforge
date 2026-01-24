<template>
  <div>
    <!-- 构建信息弹窗 -->
    <Modal 
      :show="uiStore.isModalOpen('build-info')" 
      title="构建信息" 
      @close="uiStore.closeModal('build-info')" 
    >
      <div class="space-y-4 dark:text-gray-300 p-2 text-sm">
        <div class="grid grid-cols-2 gap-y-3">
          <div class="text-gray-500">应用版本</div><div class="font-mono">{{ APP_CONFIG.version }}</div>
          <div class="text-gray-500">平台</div><div class="font-mono">{{ platform }}</div>
          <div class="text-gray-500">分支</div><div class="font-mono">main</div>
        </div>
      </div>
    </Modal>

    <!-- AI 模型配置管理 -->
    <AIProfileModal />

    <!-- 层级结构配置 -->
    <HierarchyEditorModal 
      v-if="uiStore.isModalOpen('hierarchy-editor')" 
      :show="true" 
      @close="uiStore.closeModal('hierarchy-editor')" 
    />

    <!-- 目录识别规则管理 -->
    <RecognitionModal 
      v-if="uiStore.isModalOpen('recognition')" 
      :show="true" 
      @close="uiStore.closeModal('recognition')" 
    />

    <!-- AI 指令库管理 -->
    <PromptLibraryModal 
      v-if="uiStore.isModalOpen('prompt-library')"
      :show="true"
      @close="uiStore.closeModal('prompt-library')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '@/store/ui'
import { APP_CONFIG } from '@/config/index'
import Modal from '@/components/common/Modal.vue'
import AIProfileModal from '@/components/features/ai/AIProfileModal.vue'
import HierarchyEditorModal from '@/components/features/editor/HierarchyEditorModal.vue'
import RecognitionModal from '@/components/features/editor/RecognitionModal.vue'
import PromptLibraryModal from '@/components/features/ai/PromptLibraryModal.vue'
import { isElectron } from '@/utils/env'

const uiStore = useUIStore()

const platform = computed(() => {
  if (!isElectron) return 'Web'
  return (window as any).electronAPI?.platform || 'Electron'
})
</script>
