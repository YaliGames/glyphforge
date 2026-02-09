<template>
  <div class="chapter-node">
    <div 
      class="group flex items-center gap-1.5 p-2 rounded-lg cursor-pointer transition-all duration-200 hover:translate-x-0.5 hover:bg-gray-100 dark:hover:bg-[#2d2d2d]"
      :class="active ? 'bg-blue-50 dark:bg-[#37373d] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400'"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      @click="$emit('select', node.id)"
    >
      <!-- Expand/Collapse Toggle -->
      <button 
        v-if="node.children && node.children.length > 0"
        @click.stop="chapterStore.toggleChapterCollapse(node.id)"
        class="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-transform"
        :class="{ 'rotate-0': node.collapsed, 'rotate-90': !node.collapsed }"
      >
        <i class="fa-solid fa-chevron-right text-[9px]"></i>
      </button>
      <div v-else class="w-4"></div>

      <!-- Title / DisplayName -->
      <div class="flex-1 flex items-center gap-2 min-w-0">
        <span class="text-[9px] px-1 bg-gray-100 dark:bg-[#333333] text-gray-500 rounded font-bold shrink-0 opacity-70">
          {{ depthName }}
        </span>
        <span class="text-xs truncate font-medium">
          {{ node.title || '未命名章节' }}
        </span>
      </div>

      <!-- Right Side Area: Fixed width to prevent jumping -->
      <div class="flex items-center justify-end h-5 w-[60px] relative">
        <!-- Line Number: Visible on Idle, fades out on hover -->
        <span class="text-[10px] font-mono text-gray-400 px-1 transition-opacity duration-200 group-hover:opacity-0">
          {{ node.anchorLineNumber }}
        </span>

        <!-- Actions: Shared space, fades in on hover -->
        <SidebarActionGroup 
          class="absolute right-0 top-1/2 -translate-y-1/2"
          :can-move-up="node.depth > 0"
          :can-move-down="node.depth < maxDepth"
          move-up-title="提升层级"
          move-down-title="降低层级"
          delete-title="删除章节"
          @move-up="chapterStore.updateChapter(node.id, { depth: node.depth - 1 }); projectStore.takeSnapshot()"
          @move-down="chapterStore.updateChapter(node.id, { depth: node.depth + 1 }); projectStore.takeSnapshot()"
          @delete="$emit('remove', node.id)"
        />
      </div>
    </div>

    <!-- Recursive children -->
    <div v-if="node.children && node.children.length > 0 && !node.collapsed" class="children-container">
      <ChapterTreeItem 
        v-for="child in node.children" 
        :key="child.id" 
        :node="child"
        :depth="depth + 1"
        :active-id="activeId"
        @select="(id) => $emit('select', id)"
        @remove="(id) => $emit('remove', id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Chapter } from '@/types'
import { useChapterStore } from '@/store/chapters'
import { useProjectStore } from '@/store/project'
import SidebarActionGroup from '@/components/layout/SidebarActionGroup.vue'

const chapterStore = useChapterStore()
const projectStore = useProjectStore()

const props = defineProps<{
  node: Chapter
  depth: number
  activeId: string | null
}>()

defineEmits<{
  (e: 'select', id: string): void
  (e: 'remove', id: string): void
}>()

const active = computed(() => props.activeId === props.node.id)

// 根据全局映射获取层级名称
const depthName = computed(() => {
  const hierarchies = projectStore.bundle?.project.hierarchies || []
  const h = hierarchies.find(item => item.depth === props.node.depth)
  return h ? h.name : `D${props.node.depth}`
})

const maxDepth = computed(() => {
  const hierarchies = projectStore.bundle?.project.hierarchies || []
  return hierarchies.length > 0 ? Math.max(...hierarchies.map(h => h.depth)) : 5
})
</script>
