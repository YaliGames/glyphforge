<template>
  <div class="flex items-center shrink-0 w-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
    <button 
      @click.stop="$emit('moveUp')"
      :disabled="!canMoveUp"
      class="w-5 h-5 flex items-center justify-center transition-colors"
      :class="canMoveUp ? 'text-gray-400 hover:text-blue-500' : 'text-gray-200 dark:text-[#333] cursor-not-allowed'"
      :title="canMoveUp ? moveUpTitle : ''"
    >
      <i class="fa-solid fa-chevron-up text-[10px]"></i>
    </button>
    <button 
      @click.stop="$emit('moveDown')"
      :disabled="!canMoveDown"
      class="w-5 h-5 flex items-center justify-center transition-colors"
      :class="canMoveDown ? 'text-gray-400 hover:text-blue-500' : 'text-gray-200 dark:text-[#333] cursor-not-allowed'"
      :title="canMoveDown ? moveDownTitle : ''"
    >
      <i class="fa-solid fa-chevron-down text-[10px]"></i>
    </button>
    <button 
      @click.stop="$emit('delete')"
      class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
      :title="deleteTitle"
    >
      <i class="fa-solid fa-trash-can text-[10px]"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  canMoveUp?: boolean
  canMoveDown?: boolean
  moveUpTitle?: string
  moveDownTitle?: string
  deleteTitle?: string
}>(), {
  canMoveUp: true,
  canMoveDown: true,
  moveUpTitle: '上移',
  moveDownTitle: '下移',
  deleteTitle: '删除'
})

defineEmits<{
  (e: 'moveUp'): void
  (e: 'moveDown'): void
  (e: 'delete'): void
}>()
</script>
