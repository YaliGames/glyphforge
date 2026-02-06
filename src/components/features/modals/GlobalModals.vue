<template>
  <div>
    <!-- 构建信息弹窗 -->
    <BuildInfoModal 
      v-if="uiStore.isModalOpen('build-info')" 
      @close="uiStore.closeModal('build-info')" 
    />

    <!-- AI 模型配置管理 -->
    <AIProfileModal 
      v-if="uiStore.isModalOpen('ai-profile')" 
      @close="uiStore.closeModal('ai-profile')" 
    />

    <!-- 层级结构配置 -->
    <HierarchyEditorModal 
      v-if="uiStore.isModalOpen('hierarchy-editor')" 
      @close="uiStore.closeModal('hierarchy-editor')" 
    />

    <!-- 目录识别规则管理 -->
    <RecognitionModal 
      v-if="uiStore.isModalOpen('recognition')" 
      @close="uiStore.closeModal('recognition')" 
    />

    <!-- AI 指令库管理 -->
    <PromptLibraryModal 
      v-if="uiStore.isModalOpen('prompt-library')"
      @close="uiStore.closeModal('prompt-library')"
    />

    <!-- 世界观：新建分类 -->
    <NewCategoryModal 
      v-if="uiStore.isModalOpen('new-category')"
      @close="uiStore.closeModal('new-category')"
    />

    <!-- AI：原始数据快照 -->
    <SnapshotModal 
      v-if="uiStore.isModalOpen('ai-snapshot')"
      @close="uiStore.closeModal('ai-snapshot')"
    />
  </div>
</template>

<script setup lang="ts">
import { useUIStore } from '@/store/ui'
import AIProfileModal from '@/components/features/ai/AIProfileModal.vue'
import HierarchyEditorModal from '@/components/features/editor/HierarchyEditorModal.vue'
import RecognitionModal from '@/components/features/editor/RecognitionModal.vue'
import PromptLibraryModal from '@/components/features/ai/PromptLibraryModal.vue'
import BuildInfoModal from './BuildInfoModal.vue'
import NewCategoryModal from '@/components/features/worldview/NewCategoryModal.vue'
import SnapshotModal from '@/components/features/ai/SnapshotModal.vue'

const uiStore = useUIStore()
</script>
