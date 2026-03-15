<template>
  <div v-if="show" class="flex flex-col gap-2 items-start shrink-0">
    <div class="flex items-center justify-between gap-2 px-1 text-[10px] w-full">
      <div class="flex items-center gap-2" :class="statusTextClass">
        <i class="fa-solid" :class="statusIconClass"></i>
        <span>{{ statusLabel }}</span>
      </div>

      <div class="flex items-center gap-1.5">
        <button
          v-if="canRetry"
          @click="emit('retry')"
          class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors border border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/30 dark:text-amber-400 text-[9px] font-bold"
        >
          <i class="fa-solid fa-rotate-right text-[8px]"></i>
          重试
        </button>

        <button
          v-if="canStop"
          @click="emit('stop')"
          class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors border border-red-100 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400 text-[9px] font-bold"
        >
          <i class="fa-solid fa-stop text-[8px]"></i>
          终止输出
        </button>
      </div>
    </div>

    <div v-if="showThinkingBubble" class="bg-gray-100 dark:bg-[#2d2d2d] rounded-2xl px-4 py-3 flex gap-1">
      <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
      <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
      <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AIOutputStatus } from '@/types'

const props = defineProps<{
  show: boolean
  status: AIOutputStatus
  showThinkingBubble: boolean
  canStop: boolean
  canRetry: boolean
}>()

const statusLabel = computed(() => {
  if (props.status === 'waiting') return '等待模型输出'
  if (props.status === 'streaming') return '模型输出中'
  if (props.status === 'failed') return '本次输出失败'
  return '等待模型输出'
})

const statusTextClass = computed(() => {
  if (props.status === 'failed') return 'text-red-500 dark:text-red-400'
  if (props.status === 'streaming') return 'text-blue-600 dark:text-blue-400'
  return 'text-gray-400'
})

const statusIconClass = computed(() => {
  if (props.status === 'failed') return 'fa-triangle-exclamation'
  if (props.status === 'streaming') return 'fa-circle-notch fa-spin'
  return 'fa-hourglass-half'
})

const emit = defineEmits<{
  (event: 'stop'): void
  (event: 'retry'): void
}>()
</script>
