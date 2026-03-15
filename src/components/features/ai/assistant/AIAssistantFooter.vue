<template>
  <footer class="p-4 border-t dark:border-[#333] bg-gray-50/50 dark:bg-[#252525]/50 backdrop-blur-md shrink-0 space-y-2">
    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <button
          @click="emit('toggle-prompts')"
          class="w-full h-9 flex items-center justify-between gap-2 px-3 rounded-xl border text-[11px] font-semibold transition-all duration-150"
          :class="[
            activePanel === 'prompts'
              ? (selectedPromptId
                ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-500/50 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'bg-app-active border-blue-500/50 text-blue-600 dark:text-blue-400 shadow-sm')
              : (selectedPromptId
                ? 'bg-app-main border-purple-500/40 text-purple-600 dark:text-purple-400'
                : 'bg-app-main border-divider text-content-secondary'),
            selectedPromptId
              ? 'hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-500/50 hover:text-purple-600 dark:hover:text-purple-400 hover:shadow-sm'
              : 'hover:bg-app-active hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm'
          ]"
        >
          <div class="flex items-center gap-2 truncate">
            <i class="fa-solid fa-wand-sparkles text-[9px]"></i>
            <span class="truncate">{{ selectedPromptId ? selectedPromptLabel : '选择任务模板' }}</span>
          </div>
          <i class="fa-solid fa-chevron-down text-[8px] opacity-50"></i>
        </button>
        <button
          v-if="selectedPromptId"
          @click.stop="emit('clear-prompt')"
          class="absolute -top-1 -right-1 w-4 h-4 rounded-full border border-divider bg-app-elevated flex items-center justify-center text-[8px] text-content-tertiary hover:text-red-500 transition-colors"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <button
        @click="emit('toggle-context')"
        class="w-9 h-9 flex items-center justify-center rounded-xl border transition-all duration-150"
        :class="[
          activePanel === 'context'
            ? 'bg-app-active border-blue-500/50 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'bg-app-main border-divider text-content-secondary hover:bg-app-active hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm'
        ]"
        title="手动选择参考上下文"
      >
        <i class="fa-solid fa-database text-[10px]"></i>
      </button>

      <button
        @click="emit('add-current-reference')"
        :disabled="!canReferenceCurrent"
        class="w-9 h-9 flex items-center justify-center rounded-xl border transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
        :class="canReferenceCurrent
          ? 'bg-app-main border-divider text-content-secondary hover:bg-app-active hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm'
          : 'bg-app-main border-divider text-content-secondary'"
        title="添加当前页面实体到参考"
      >
        <i class="fa-solid fa-link text-[10px]"></i>
      </button>
    </div>

    <div v-if="activeReferences.length > 0" class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-h-[28px]">
      <div
        v-for="(ref, idx) in activeReferences"
        :key="idx"
        class="flex items-center gap-1.5 px-2.5 h-6 rounded-lg border border-divider bg-app-main text-[10px] text-content-secondary shrink-0"
      >
        <i class="fa-solid" :class="[
          ref.type === 'character' ? 'fa-user' :
          ref.type === 'manuscript' ? 'fa-file-lines' :
          ref.type === 'outline' ? 'fa-scroll' :
          ref.type === 'worldview' ? 'fa-earth-asia' :
          ref.type === 'timeline' ? 'fa-clock-rotate-left' :
          ref.type === 'chapters' ? 'fa-list-ul' : 'fa-tag'
        ]"></i>
        <span class="font-bold">@{{ ref.label }}</span>
        <button @click="emit('remove-reference', ref)" class="ml-0.5 text-content-tertiary hover:text-red-500 transition-colors">
          <i class="fa-solid fa-circle-xmark opacity-60"></i>
        </button>
      </div>
    </div>

    <div class="relative">
      <Input
        :ref="inputAreaRef"
        v-model="inputModel"
        :disabled="isDebugMockMode"
        type="textarea"
        :rows="4"
        color="purple"
        input-class="rounded-xl bg-app-main pl-3.5 pr-12 py-2.5 text-[12px] leading-relaxed"
        :placeholder="isDebugMockMode ? 'UI 调试预览已开启，当前输入不会发送' : '输入任务描述，支持 @ 引用实体...'"
        @input="emit('input-event', $event)"
        @blur="emit('input-blur')"
        @keydown="emit('input-keydown', $event)"
        @keydown.enter.ctrl.exact="emit('send')"
      />
    </div>

    <div class="flex items-center gap-2 h-9">
      <div class="flex items-center gap-2 h-full min-w-0 flex-1">
        <select
          v-model="executionModeModel"
          class="h-full min-w-[84px] shrink-0 bg-app-main border rounded-xl px-3 text-[11px] font-semibold outline-none transition-all duration-150 cursor-pointer"
          :class="[
            executionMode === 'agent'
              ? 'text-amber-600 dark:text-amber-400 border-amber-500/40 hover:shadow-sm'
              : 'text-blue-600 dark:text-blue-400 border-blue-500/40 hover:shadow-sm'
          ]"
        >
          <option value="chat">Chat</option>
          <option value="agent">Agent</option>
        </select>

        <button
          type="button"
          @click="emit('open-model-config')"
          class="h-full flex-1 min-w-0 flex items-center gap-2 px-3 text-[11px] font-semibold text-content-secondary bg-app-main rounded-xl border border-divider transition-all duration-150 hover:bg-app-active hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm"
          title="打开模型配置"
        >
          <i class="fa-solid fa-microchip text-[9px] text-content-tertiary shrink-0"></i>
          <span class="truncate">{{ modelName || '未选模型' }}</span>
        </button>
      </div>

      <div class="flex items-center gap-3 h-full shrink-0">
        <span class="text-ui-badge">Ctrl+Enter</span>
        <button
          @click="emit('send')"
          :disabled="isDebugMockMode || (!isProcessing && !inputValue.trim())"
          :title="isProcessing ? '终止' : '发送'"
          class="h-full min-w-[74px] flex items-center justify-center px-4 rounded-xl text-[11px] font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-30 transition-colors"
        >
          <template v-if="!isProcessing">
            <i class="fa-solid fa-paper-plane text-[9px]"></i>
            <span class="ml-1">发送</span>
          </template>
          <template v-else>
            <i class="fa-solid fa-stop text-[9px]"></i>
            <span class="ml-1">终止</span>
          </template>
        </button>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AIExecutionMode, AIReference } from '@/types'
import Input from '@/components/common/Input.vue'

const props = defineProps<{
  activePanel: 'context' | 'prompts' | null
  selectedPromptId: string
  selectedPromptLabel?: string
  activeReferences: AIReference[]
  canReferenceCurrent: boolean
  isDebugMockMode: boolean
  inputValue: string
  executionMode: AIExecutionMode
  modelName?: string
  isProcessing: boolean
  inputAreaRef: any
}>()

const emit = defineEmits<{
  (event: 'toggle-prompts'): void
  (event: 'clear-prompt'): void
  (event: 'toggle-context'): void
  (event: 'add-current-reference'): void
  (event: 'remove-reference', reference: AIReference): void
  (event: 'input-event', payload: Event): void
  (event: 'input-blur'): void
  (event: 'input-keydown', payload: KeyboardEvent): void
  (event: 'open-model-config'): void
  (event: 'send'): void
  (event: 'update:inputValue', value: string): void
  (event: 'update:executionMode', value: AIExecutionMode): void
}>()

const inputModel = computed({
  get: () => props.inputValue,
  set: (value: string) => emit('update:inputValue', value)
})

const executionModeModel = computed({
  get: () => props.executionMode,
  set: (value: AIExecutionMode) => emit('update:executionMode', value)
})
</script>
