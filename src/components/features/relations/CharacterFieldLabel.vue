<template>
  <div class="flex items-center gap-2 group">
    <label class="text-ui-label">{{ label }}</label>
    <div v-if="isOverridden" class="flex items-center gap-1">
      <i class="fa-solid fa-pen-nib text-[10px] text-orange-400" title="字段在当前阶段发生了变化"></i>
      <button @click="$emit('restore')"
        class="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-orange-400 hover:text-orange-700"
        title="将字段在当前阶段恢复为基础值">
        恢复默认
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  isOverridden?: boolean
}>()

defineEmits<{
  (e: 'restore'): void
}>()
</script>