<template>
  <div v-if="isDebugMockMode" class="shrink-0 flex items-center justify-between gap-3 px-3 py-2 rounded-2xl border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/80 dark:bg-amber-900/10 text-amber-700 dark:text-amber-300 shadow-sm">
    <div class="flex items-center gap-2 min-w-0">
      <i class="fa-solid fa-bug text-[10px] shrink-0"></i>
      <span class="text-[11px] font-bold truncate">UI 调试预览已开启，当前内容均为 mock 数据，不会写入项目。</span>
    </div>
    <button
      @click="emit('reset-debug')"
      class="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/70 dark:bg-black/20 border border-amber-200/70 dark:border-amber-700/40 hover:bg-white dark:hover:bg-black/30 transition-colors"
    >
      重置
    </button>
  </div>

  <EmptyState
    v-if="displayHistory.length === 0"
    icon="fa-comment-dots"
    size="xl"
    :circle="false"
    subtitle="选择要提供给AI参考内容，并开始对话"
  />

  <div v-for="msg in displayHistory" :key="msg.id">
    <div
      v-if="msg.role !== 'tool' && (msg.content?.trim() || (msg.toolCalls && msg.toolCalls.length > 0))"
      class="flex flex-col gap-2 shrink-0 group/msg"
      :class="msg.role === 'user' ? 'items-end' : 'items-start'"
    >
      <div class="flex items-center gap-2 px-1 text-[10px] text-gray-400 w-full" :class="msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'">
        <div class="flex items-center gap-2 shrink-0">
          <i :class="msg.role === 'user' ? 'fa-solid fa-user' : 'fa-solid fa-robot'"></i>
          <span>{{ msg.role === 'user' ? '你' : 'G-Forge AI' }}</span>
        </div>

        <IconButton
          v-if="msg.content"
          icon="fa-regular fa-copy"
          size="xs"
          title="复制原始 MD 内容"
          class="opacity-0 group-hover/msg:opacity-100 transition-opacity hover:!text-purple-600"
          @click="emit('copy-content', msg.content)"
        />
      </div>

      <div
        class="max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative group/msg cursor-text select-text overflow-hidden"
        :class="[
          msg.role === 'user' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10' : 'bg-gray-100 dark:bg-[#2d2d2d] dark:text-gray-200',
          msg.isError ? '!bg-red-50 dark:!bg-red-900/10 border border-red-200 dark:border-red-900/50 !text-red-600 dark:!text-red-400' : ''
        ]"
      >
        <div v-if="msg.isError" class="flex flex-col gap-3">
          <div class="flex items-start gap-2">
            <i class="fa-solid fa-triangle-exclamation mt-1 shrink-0"></i>
            <div class="markdown-content" v-html="renderMarkdown(msg.content)"></div>
          </div>
          <button
            v-if="msg.retryParams && shouldShowRetry(msg.id)"
            @click="emit('retry-message', msg.id)"
            class="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-red-600 text-white text-[11px] font-bold hover:bg-red-700 transition-all active:scale-95 shadow-md shadow-red-500/20"
          >
            <i class="fa-solid fa-rotate-right text-[10px]"></i>
            立即重试任务
          </button>
        </div>
        <div v-else class="markdown-content" v-html="renderMarkdown(msg.content)"></div>

        <div v-if="msg.toolCalls && msg.toolCalls.length > 0" class="mt-3 space-y-0">
          <div v-for="(call, callIndex) in msg.toolCalls" :key="call.id" class="group/tool relative transition-all duration-200 flex gap-0">
            <div
              class="w-0.5 shrink-0 bg-gradient-to-b"
              :class="[
                callIndex === 0 && msg.toolCalls.length > 1
                  ? 'from-transparent via-gray-300 to-gray-300 dark:via-gray-600 dark:to-gray-600'
                  : callIndex === msg.toolCalls.length - 1
                  ? 'from-gray-300 via-gray-300 to-transparent dark:from-gray-600 dark:via-gray-600 dark:to-transparent'
                  : 'from-gray-300 to-gray-300 dark:from-gray-600 dark:to-gray-600'
              ]"
            ></div>

            <div class="flex-1 flex flex-col">
              <div
                class="flex items-center gap-2 cursor-pointer select-none p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                @click="emit('toggle-tool', call.id)"
              >
                <div
                  class="shrink-0 w-1.5 h-1.5 rounded-full"
                  :class="[
                    readOnlyTools.includes(call.function.name) || (isToolExecuted(call.id) && !isToolRejected(call.id) && !isToolFailed(call.id)) ? 'bg-green-500' : '',
                    isToolRejected(call.id) ? 'bg-gray-400' : '',
                    isToolFailed(call.id) ? 'bg-red-500' : '',
                    !isToolExecuted(call.id) && !readOnlyTools.includes(call.function.name) ? 'bg-blue-500' : ''
                  ]"
                />

                <div class="flex-1 min-w-0">
                  <div class="text-[11px] leading-relaxed text-gray-700 dark:text-gray-300 font-medium">
                    {{ getToolSummary(call) }}
                  </div>
                </div>

                <i class="fa-solid fa-chevron-down text-[8px] text-gray-400 shrink-0" :class="expandedToolCallIds.has(call.id) ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
              </div>

              <div v-if="expandedToolCallIds.has(call.id)" class="mt-2 mx-2 p-2 rounded border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/20 space-y-2 animate-in fade-in duration-200">
                <div class="space-y-1">
                  <div class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">API: <span class="font-mono text-blue-600 dark:text-blue-400">{{ call.function.name }}</span></div>
                  <pre class="p-1.5 bg-white dark:bg-black/40 rounded border dark:border-white/5 text-[9px] text-gray-500 overflow-x-auto whitespace-pre-wrap leading-tight max-h-[120px]">{{ formatArgs(call.function.arguments) }}</pre>
                </div>

                <div v-if="getToolResultForCall(call.id)" class="space-y-1">
                  <div class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">结果</div>
                  <div
                    class="p-1.5 rounded text-[9px] font-mono leading-tight max-h-[80px] overflow-y-auto"
                    :class="isToolRejected(call.id) ? 'bg-gray-100 dark:bg-gray-900/30 text-gray-500' : 'bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400'"
                  >
                    {{ isToolRejected(call.id) ? '已拒绝' : getToolResultForCall(call.id)?.content }}
                  </div>
                </div>

                <div v-if="!isToolExecuted(call.id) && !readOnlyTools.includes(call.function.name) && !isAssistantBusy" class="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-white/5">
                  <button
                    @click.stop="emit('apply-tool', { messageId: msg.id, call })"
                    class="text-[9px] bg-[#007acc] hover:bg-[#0062a3] text-white px-2 py-1 rounded transition-all font-bold flex items-center gap-1 active:scale-95"
                  >
                    <i class="fa-solid fa-bolt-lightning text-[8px]"></i>
                    执行
                  </button>
                  <button
                    @click.stop="emit('reject-tool', { messageId: msg.id, call })"
                    class="text-[9px] bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-600 dark:text-gray-400 px-2 py-1 rounded transition-all font-bold flex items-center gap-1 active:scale-95"
                  >
                    <i class="fa-solid fa-ban text-[8px]"></i>
                    拒绝
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="msg.selectedReferences && msg.selectedReferences.length > 0" class="mt-2 flex flex-wrap justify-end gap-1 border-t border-black/5 dark:border-white/5 pt-2">
          <div
            v-for="(ref, ridx) in msg.selectedReferences"
            :key="ridx"
            class="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border transition-colors shadow-sm"
            :class="msg.role === 'user'
              ? 'bg-white/20 border-white/20 text-white'
              : 'bg-purple-50 dark:bg-purple-900/40 border-purple-100 dark:border-purple-800 text-purple-600 dark:text-purple-400'"
          >
            <i class="fa-solid fa-at text-[7px] opacity-70"></i>
            <span>{{ ref.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AIHistoryItem, AIToolCall, AIToolResult } from '@/types'
import EmptyState from '@/components/common/EmptyState.vue'
import IconButton from '@/components/common/IconButton.vue'

interface ToolActionPayload {
  messageId: string
  call: AIToolCall
}

defineProps<{
  displayHistory: AIHistoryItem[]
  isDebugMockMode: boolean
  isAssistantBusy: boolean
  isProcessing: boolean
  readOnlyTools: string[]
  expandedToolCallIds: Set<string>
  renderMarkdown: (content: string) => string
  formatArgs: (raw: string) => string
  getToolSummary: (call: AIToolCall) => string
  getToolResultForCall: (callId: string) => AIToolResult | null
  isToolRejected: (callId: string) => boolean
  isToolFailed: (callId: string) => boolean
  isToolExecuted: (callId: string) => boolean
  shouldShowRetry: (messageId: string) => boolean
}>()

const emit = defineEmits<{
  (event: 'reset-debug'): void
  (event: 'copy-content', content: string): void
  (event: 'retry-message', messageId: string): void
  (event: 'toggle-tool', callId: string): void
  (event: 'apply-tool', payload: ToolActionPayload): void
  (event: 'reject-tool', payload: ToolActionPayload): void
}>()
</script>
