<template>
  <div class="flex items-center justify-center shrink-0 w-[60px] h-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
    <IconButton
      icon="fa-solid fa-chevron-up"
      size="xs"
      :title="canMoveUp ? moveUpTitle : ''"
      :disabled="!canMoveUp"
      @click.stop="$emit('moveUp')"
    />
    <IconButton
      icon="fa-solid fa-chevron-down"
      size="xs"
      :title="canMoveDown ? moveDownTitle : ''"
      :disabled="!canMoveDown"
      @click.stop="$emit('moveDown')"
    />
    <IconButton
      icon="fa-solid fa-trash-can"
      size="xs"
      variant="danger"
      :title="deleteTitle"
      @click.stop="$emit('delete')"
    />
  </div>
</template>

<script setup lang="ts">
import IconButton from '@/components/common/IconButton.vue'

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
