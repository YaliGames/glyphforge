<template>
  <aside 
    class="flex flex-col shrink-0 overflow-hidden bg-white dark:bg-[#252526]"
    :class="[width, borderClass]"
  >
    <!-- Panel Header -->
    <div class="h-10 border-b dark:border-[#333333] flex items-center justify-between px-3 shrink-0">
      <h2 class="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate">
        {{ title }}
      </h2>
      <div class="flex items-center gap-1">
        <slot name="actions"></slot>
      </div>
    </div>
    
    <!-- Panel Content -->
    <div class="flex-1 overflow-y-auto custom-scrollbar">
      <slot></slot>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  width?: string
  side?: 'left' | 'right'
}>(), {
  width: 'w-64',
  side: 'left'
})

const borderClass = computed(() => {
  return props.side === 'left' ? 'border-r dark:border-[#333333]' : 'border-l dark:border-[#333333]'
})
</script>
