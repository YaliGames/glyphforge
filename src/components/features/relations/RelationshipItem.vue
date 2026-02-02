<template>
  <div
    class="group relative flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-[#444] hover:bg-gray-50 dark:hover:bg-[#252525] transition-all">
    <div
      v-if="currentPhaseId && rel.overrides?.[currentPhaseId]?.isActive === true && rel._original?.isActive === false"
      class="absolute -top-1.5 -left-1.5 z-10 w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 flex items-center justify-center border border-green-200 dark:border-green-800 shadow-sm"
      title="当前阶段临时添加的关系">
      <i class="fa-solid fa-link text-[8px]"></i>
    </div>
    <div v-else-if="currentPhaseId && rel.overrides?.[currentPhaseId]"
      class="absolute -top-1.5 -left-1.5 z-10 w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800 shadow-sm"
      title="当前阶段有特殊变更">
      <i class="fa-solid fa-pen text-[8px]"></i>
    </div>

    <div class="w-24 shrink-0">
      <template v-if="rel.sourceId === activeCharacter.id">
        <div
          class="w-full bg-gray-100 dark:bg-[#333] border dark:border-[#444] text-gray-500 rounded px-2 py-1.5 text-xs truncate">
          {{ activeCharacter.name }}
        </div>
      </template>
      <template v-else>
        <select :value="rel.sourceId"
          class="w-full bg-white dark:bg-[#1e1e1e] border dark:border-[#333] rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500 truncate"
          @change="(e) => $emit('update', { sourceId: (e.target as HTMLSelectElement).value })">
          <option value="" disabled>选择角色</option>
          <option v-for="c in otherCharacters" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </template>
    </div>

    <div class="relative w-6 h-6 flex items-center justify-center shrink-0">
      <span class="text-[10px] text-gray-400 group-hover:opacity-0 transition-opacity">是</span>
      <button @click="$emit('swap')" title="切换方向"
        class="absolute inset-0 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100">
        <i class="fa-solid fa-right-left text-[10px] text-gray-400"></i>
      </button>
    </div>

    <div class="w-24 shrink-0">
      <template v-if="rel.targetId === activeCharacter.id">
        <div
          class="w-full bg-gray-100 dark:bg-[#333] border dark:border-[#444] text-gray-500 rounded px-2 py-1.5 text-xs truncate">
          {{ activeCharacter.name }}
        </div>
      </template>
      <template v-else>
        <select :value="rel.targetId"
          class="w-full bg-white dark:bg-[#1e1e1e] border dark:border-[#333] rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500 truncate"
          @change="(e) => $emit('update', { targetId: (e.target as HTMLSelectElement).value })">
          <option value="" disabled>选择角色</option>
          <option v-for="c in otherCharacters" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </template>
    </div>

    <div class="relative w-6 h-6 flex items-center justify-center shrink-0">
      <span class="text-[10px] text-gray-400">的</span>
    </div>

    <div class="relative w-24 shrink-0">
      <input :value="rel.label" placeholder="关系名称"
        class="w-full bg-white dark:bg-[#1e1e1e] border dark:border-[#333] rounded px-2 py-1.5 text-xs text-center outline-none focus:border-blue-500 transition-colors"
        @change="(e) => $emit('update', { label: (e.target as HTMLInputElement).value })" />
    </div>

    <div class="flex-1 flex items-center gap-2 pl-2 border-l dark:border-[#333] ml-2 border-dashed min-w-[100px]">
      <i class="fa-regular fa-note-sticky text-gray-300 text-[10px] shrink-0"></i>
      <input :value="rel.notes" placeholder="添加备注..."
        class="w-full bg-transparent border-none py-1 text-xs outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-500"
        @change="(e) => $emit('update', { notes: (e.target as HTMLInputElement).value })" />
    </div>

    <button @click="$emit('remove')" :title="deleteActionTitle"
      class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all opacity-0 group-hover:opacity-100">
      <i :class="deleteIconClass" class="text-[10px]"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RelationshipData } from '@/types'

const props = defineProps<{
  rel: any
  activeCharacter: { id: string, name: string }
  otherCharacters: Array<{ id: string, name: string }>
  currentPhaseId: string | null
}>()

const emit = defineEmits<{
  (e: 'update', updates: Partial<RelationshipData>): void
  (e: 'swap'): void
  (e: 'remove'): void
}>()

const isTemporary = computed(() => {
  return props.currentPhaseId &&
    props.rel._original?.isActive === false &&
    props.rel.overrides?.[props.currentPhaseId]?.isActive === true
})

const isLogicalDelete = computed(() => {
  return props.currentPhaseId && !isTemporary.value
})

const deleteActionTitle = computed(() => {
  return isLogicalDelete.value ? '在此阶段断绝' : '永久删除'
})

const deleteIconClass = computed(() => {
  return isLogicalDelete.value ? 'fa-solid fa-eye-slash' : 'fa-solid fa-trash-can'
})
</script>