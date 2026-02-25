<template>
  <aside 
    ref="sidePanelRef"
    class="flex flex-col shrink-0 overflow-hidden bg-app-panel relative"
    :class="[borderClass]"
    :style="{ width: `${props.side === 'left' ? uiStore.leftPanelWidth : uiStore.rightPanelWidth}px` }"
  >
    <!-- Resize Handle -->
    <div 
      class="absolute top-0 bottom-0 w-1 cursor-col-resize z-50 hover:bg-blue-500/30 transition-colors"
      :class="side === 'left' ? 'right-0' : 'left-0'"
      @mousedown="startResize"
    ></div>

    <!-- Panel Header -->
    <div class="h-10 border-b border-divider flex items-center justify-between px-3 shrink-0">
      <h2 class="text-ui-header truncate">
        {{ title }}
      </h2>
      <div class="flex items-center gap-1">
        <slot name="actions"></slot>
      </div>
    </div>
    
    <!-- Panel Content -->
    <div class="flex-1 overflow-y-auto">
      <slot></slot>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useUIStore } from '@/store/ui'

const props = withDefaults(defineProps<{
  title: string
  width?: string // Keep for compatibility but prioritize global sync
  side?: 'left' | 'right'
}>(), {
  width: 'w-64',
  side: 'left'
})

const uiStore = useUIStore()
const sidePanelRef = ref<HTMLElement | null>(null)

const borderClass = computed(() => {
  return props.side === 'left' ? 'border-r border-divider' : 'border-l border-divider'
})

let isResizing = false

function startResize(e: MouseEvent) {
  isResizing = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function handleResize(e: MouseEvent) {
  if (!isResizing || !sidePanelRef.value) return
  
  const rect = sidePanelRef.value.getBoundingClientRect()

  if (props.side === 'left') {
    const newWidth = e.clientX - rect.left
    uiStore.setLeftPanelWidth(newWidth)
  } else {
    const newWidth = rect.right - e.clientX
    uiStore.setRightPanelWidth(newWidth)
  }
}

function stopResize() {
  isResizing = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onUnmounted(() => {
  stopResize()
})
</script>
