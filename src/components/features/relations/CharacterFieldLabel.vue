<template>
  <div class="flex items-center gap-2">
    <label class="text-[10px] font-bold text-gray-500 uppercase">{{ label }}</label>
    <i v-if="isOverridden" class="fa-solid fa-pen-nib text-[10px] text-orange-400 animate-pulse"
      title="此字段在当前阶段有特殊设定 (Override)"></i>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  isOverridden?: boolean
}>()
</script>