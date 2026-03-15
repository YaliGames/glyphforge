<template>
  <div v-if="atMenu.visible" class="absolute inset-0 z-[95]" @click="emit('close')"></div>
  <div
    v-if="atMenu.visible"
    @mousedown.prevent
    class="absolute bottom-[200px] left-4 z-[100] bg-white dark:bg-[#222] border dark:border-[#333] rounded-xl shadow-2xl w-56 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
  >
    <div v-if="atMenu.step === 1" class="py-1">
      <div class="px-3 py-2 text-ui-header border-b border-divider mb-1 flex items-center gap-2">
        <i class="fa-solid fa-at text-purple-500"></i>
        引用实体类型
      </div>
      <div :ref="atScrollContainer1" class="max-h-[300px] overflow-y-auto custom-scrollbar">
        <button
          v-for="(type, idx) in atMenu.types"
          :key="type.value"
          @click="emit('select-type', type)"
          class="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] transition-colors"
          :class="atMenu.selectedIndex === idx ? 'bg-purple-600 text-white active-at-item' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'"
        >
          <i class="fa-solid w-4 text-center" :class="type.icon"></i>
          {{ type.label }}
          <i class="fa-solid fa-chevron-right ml-auto text-[9px] opacity-30"></i>
        </button>
      </div>
    </div>

    <div v-else class="py-1 flex flex-col max-h-[320px]">
      <div class="px-3 py-2 flex items-center justify-between border-b border-divider mb-1 bg-app-side">
        <span class="text-ui-header flex items-center gap-2">
          <button @click="emit('back-step')" class="hover:text-purple-700"><i class="fa-solid fa-arrow-left"></i></button>
          选择{{ atMenu.types.find(t => t.value === atMenu.selectedType)?.label }}
        </span>
        <span v-if="atMenu.search" class="text-[9px] bg-purple-100 dark:bg-purple-900/40 px-1.5 py-0.5 rounded text-purple-600">{{ atMenu.search }}</span>
      </div>
      <div :ref="atScrollContainer2" class="flex-1 overflow-y-auto custom-scrollbar pr-0.5">
        <button
          v-for="(item, idx) in filteredAtInstances"
          :key="item.id"
          @click="emit('confirm-reference', item)"
          class="w-full text-left px-3 py-2.5 text-[13px] transition-colors truncate border-b border-gray-50 dark:border-white/5 last:border-0"
          :class="atMenu.selectedIndex === idx ? 'bg-purple-600 text-white active-at-item' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'"
        >
          <i class="fa-solid fa-check-circle mr-2 text-[10px]" :class="atMenu.selectedIndex === idx ? 'opacity-100' : 'opacity-0'"></i>
          {{ item.label }}
        </button>
        <div v-if="filteredAtInstances.length === 0" class="px-3 py-8 text-center">
          <i class="fa-solid fa-magnifying-glass text-gray-300 mb-2 block"></i>
          <span class="text-xs text-gray-400">未找到相关项</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AIMentionType } from '@/composables/ai/constants'

defineProps<{
  atMenu: {
    visible: boolean
    step: 1 | 2
    search: string
    selectedType: string | null
    selectedIndex: number
    types: AIMentionType[]
  }
  filteredAtInstances: Array<{ id: any; label: string }>
  atScrollContainer1: any
  atScrollContainer2: any
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'select-type', type: AIMentionType): void
  (event: 'back-step'): void
  (event: 'confirm-reference', item: any): void
}>()
</script>
