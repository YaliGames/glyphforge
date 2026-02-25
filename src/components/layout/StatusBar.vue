<template>
  <footer class="h-6 border-t border-divider bg-app-main flex items-center px-4 text-[10px] text-gray-500 dark:text-gray-400 justify-between shrink-0 select-none">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-1.5">
        <i class="fa-solid fa-folder-open text-[9px]"></i>
        <span>项目: {{ projectStore.currentProject?.title || '未加载项目' }}</span>
      </div>
      <div v-if="projectStore.isDirty" class="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium animate-pulse">
        <i class="fa-solid fa-circle text-[6px]"></i>
        <span>已修改</span>
      </div>
    </div>
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <span>{{ uiStore.isLoading ? '处理中...' : '就绪' }}</span>
      </div>
      <div class="w-px h-3 bg-divider"></div>
      <div class="hover:text-blue-600 transition-colors cursor-pointer">
        <span>GlyphForge v{{ APP_CONFIG.version }}</span>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useProjectStore } from '@/store/project'
import { useUIStore } from '@/store/ui'
import { APP_CONFIG } from '@/config/index'

const projectStore = useProjectStore()
const uiStore = useUIStore()
</script>
