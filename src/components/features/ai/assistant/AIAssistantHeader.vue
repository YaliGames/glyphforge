<template>
  <header class="h-14 border-b dark:border-[#333] px-4 flex items-center justify-between bg-gray-50/50 dark:bg-[#252525]/50 backdrop-blur-md shrink-0">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
        <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
      </div>
      <div class="flex flex-col">
        <span class="text-[11px] font-bold dark:text-gray-200 leading-none">AI 创作助手</span>
        <span class="text-[9px] text-gray-400 mt-1 uppercase tracking-wider">{{ profileName || '' }}</span>
      </div>
    </div>

    <div class="flex items-center gap-1">
      <IconButton
        icon="fa-solid fa-bug"
        :active="isDebugMockMode"
        :title="isDebugMockMode ? '关闭 UI 调试预览' : '打开 UI 调试预览'"
        @click="emit('toggle-debug')"
      />
      <IconButton
        v-if="isDebugMockMode"
        icon="fa-solid fa-rotate-right"
        title="重置 mock 对话"
        @click="emit('reset-debug')"
      />
      <IconButton
        icon="fa-solid fa-gear"
        icon-class="group-hover:rotate-45 transition-transform"
        title="AI 模型管理"
        class="group"
        @click="emit('open-profile')"
      />
      <IconButton
        icon="fa-solid fa-xmark"
        @click="emit('close')"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
import IconButton from '@/components/common/IconButton.vue'

defineProps<{
  profileName?: string
  isDebugMockMode: boolean
}>()

const emit = defineEmits<{
  (event: 'toggle-debug'): void
  (event: 'reset-debug'): void
  (event: 'open-profile'): void
  (event: 'close'): void
}>()
</script>
