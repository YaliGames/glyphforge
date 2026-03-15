<template>
  <div v-if="aiStore.isVisible" 
    ref="containerRef"
    class="h-full bg-white dark:bg-[#1e1e1e] border-l dark:border-[#333] flex flex-col overflow-hidden shrink-0 z-10 relative"
    :style="{ width: `${uiStore.rightPanelWidth}px` }"
  >
    <!-- Resize Handle -->
    <div 
      class="absolute top-0 bottom-0 left-0 w-1 cursor-col-resize z-50 hover:bg-purple-500/30 transition-colors"
      @mousedown="startResize"
    ></div>

    <!-- 头部 -->
    <AIAssistantHeader
      :profile-name="settingsStore.activeAIProfile?.name"
      :is-debug-mock-mode="isDebugMockMode"
      @toggle-debug="toggleDebugMockMode"
      @reset-debug="resetDebugMockPreview"
      @open-profile="uiStore.openModal('ai-profile')"
      @close="aiStore.toggle()"
    />

    <!-- 中间内容区容器 -->
    <div class="flex-1 relative overflow-hidden">
      <!-- 聊天记录滚动区 -->
      <div class="absolute inset-0 overflow-y-auto p-4 space-y-2 flex flex-col pb-8" ref="historyBox" @scroll="handleHistoryScroll">
        <AIAssistantHistory
          :display-history="displayHistory"
          :is-debug-mock-mode="isDebugMockMode"
          :is-assistant-busy="isAssistantBusy"
          :is-processing="aiStore.isProcessing"
          :read-only-tools="readOnlyTools"
          :expanded-tool-call-ids="expandedToolCallIds"
          :render-markdown="renderMarkdown"
          :format-args="formatArgs"
          :get-tool-summary="getToolSummary"
          :get-tool-result-for-call="getToolResultForCall"
          :is-tool-rejected="isToolRejected"
          :is-tool-failed="isToolFailed"
          :is-tool-executed="isToolExecuted"
          :should-show-retry="shouldShowInlineRetry"
          @reset-debug="resetDebugMockPreview"
          @copy-content="copyContent"
          @retry-message="aiStore.retryMessage"
          @toggle-tool="toggleExpandedToolCall"
          @apply-tool="({ messageId, call }) => handleApplyTool(messageId, call)"
          @reject-tool="({ messageId, call }) => handleRejectTool(messageId, call)"
        />

      <!-- 处理中表现：仅在没有正在生成的回复内容时显示 -->
      <AIAssistantProcessingIndicator
        :show="showOutputStatusIndicator"
        :status="aiStore.outputStatus"
        :show-thinking-bubble="showThinkingBubble"
        :can-stop="aiStore.isProcessing"
        :can-retry="Boolean(latestFailedMessageId) && !aiStore.isProcessing"
        @stop="aiStore.stopGeneration"
        @retry="retryLatestFailed"
      />
      </div>

      <button
        v-if="showScrollToBottomButton"
        type="button"
        @click="jumpToBottom"
        class="absolute right-4 bottom-4 z-20 w-8 h-8 rounded-full border border-blue-500/30 bg-app-elevated text-blue-600 dark:text-blue-400 hover:bg-app-active hover:border-blue-500/50 transition-all duration-150 shadow-sm"
        title="回到底部"
      >
        <i class="fa-solid fa-angles-down text-[10px]"></i>
      </button>

      <AIAssistantPanelOverlay
        :active-panel="activePanel"
        :selected-prompt-id="selectedPromptId"
        :all-prompts="aiStore.allPrompts"
        :reference-keys="aiStore.referenceKeys"
        :granular-selections="granularSelections"
        :expanded-keys="expandedKeys"
        :find-node-by-value="findNodeByValue"
        :get-options-for-value="getOptionsForValue"
        @update:active-panel="activePanel = $event"
        @update:selected-prompt-id="selectedPromptId = $event"
        @toggle-context="toggleContext"
        @toggle-select-all="toggleSelectAll"
        @toggle-granular-item="({ key, id }) => toggleGranularItem(key, id)"
        @open-prompt-library="uiStore.openModal('prompt-library')"
      />
    </div>


    <!-- 输入区 (4行设计) -->
    <AIAssistantFooter
      :active-panel="activePanel"
      :selected-prompt-id="selectedPromptId"
      :selected-prompt-label="selectedPromptLabel"
      :active-references="activeReferences"
      :can-reference-current="canReferenceCurrent"
      :is-debug-mock-mode="isDebugMockMode"
      :input-value="input"
      :execution-mode="executionMode"
      :model-name="settingsStore.activeAIProfile?.model"
      :is-processing="aiStore.isProcessing"
      :input-area-ref="inputAreaRef"
      @toggle-prompts="activePanel = activePanel === 'prompts' ? null : 'prompts'"
      @clear-prompt="selectedPromptId = ''"
      @toggle-context="activePanel = activePanel === 'context' ? null : 'context'"
      @add-current-reference="addCurrentEntityToReference"
      @remove-reference="removeReference"
      @input-event="handleAtInput"
      @input-blur="handleAtBlur"
      @input-keydown="handleAtKeydown"
      @open-model-config="uiStore.openModal('ai-profile')"
      @send="handleSendAction"
      @update:input-value="input = $event"
      @update:execution-mode="executionMode = $event"
    />

    <AIAssistantMentionMenu
      :at-menu="atMenu"
      :filtered-at-instances="filteredAtInstances"
      :at-scroll-container1="atScrollContainer1"
      :at-scroll-container2="atScrollContainer2"
      @close="closeAtMenu"
      @select-type="selectAtType"
      @back-step="atMenu.step = 1"
      @confirm-reference="confirmAtReference"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, reactive } from 'vue'
import { marked } from 'marked'
import { useAIStore } from '@/store/ai'
import { useProjectStore } from '@/store/project'
import { useCharacterStore } from '@/store/characters'
import { useOutlineStore } from '@/store/outline'
import { useWorldviewStore } from '@/store/worldview'
import { useUIStore } from '@/store/ui'
import { useSettingsStore } from '@/store/settings'
import AIAssistantHeader from '@/components/features/ai/assistant/AIAssistantHeader.vue'
import AIAssistantHistory from '@/components/features/ai/assistant/AIAssistantHistory.vue'
import AIAssistantMentionMenu from '@/components/features/ai/assistant/AIAssistantMentionMenu.vue'
import AIAssistantPanelOverlay from '@/components/features/ai/assistant/AIAssistantPanelOverlay.vue'
import AIAssistantProcessingIndicator from '@/components/features/ai/assistant/AIAssistantProcessingIndicator.vue'
import AIAssistantFooter from '@/components/features/ai/assistant/AIAssistantFooter.vue'
import { useRouter } from 'vue-router'
import { useAIDebugMock } from '@/composables/ai/useAIDebugMock'
import { useAIReferences } from '@/composables/ai/useAIReferences'
import { useAIMentionMenu } from '@/composables/ai/useAIMentionMenu'
import { useAIToolExecution } from '@/composables/ai/useAIToolExecution'
import { useAIPromptComposer } from '@/composables/ai/useAIPromptComposer'
import { usePanelResize } from '@/composables/ai/usePanelResize'

const aiStore = useAIStore()
const projectStore = useProjectStore()
const characterStore = useCharacterStore()
const outlineStore = useOutlineStore()
const worldviewStore = useWorldviewStore()
const uiStore = useUIStore()
const settingsStore = useSettingsStore()
const router = useRouter()

const containerRef = ref<HTMLElement | null>(null)
const input = ref('')
const expandedToolCallIds = reactive(new Set<string>())
const historyBox = ref<HTMLElement | null>(null)
const inputAreaRef = ref<any>(null)
const activePanel = ref<'context' | 'prompts' | null>(null)
const keepAtBottomDuringCurrentOutput = ref(false)
const isHistoryPinnedToBottom = ref(true)

const {
  isDebugMockMode,
  debugMockHistory,
  debugExecutedToolCallIds,
  debugEntityNameMap,
  resetDebugMockPreview: resetDebugMockPreviewInternal,
  applyDebugTool,
  rejectDebugTool
} = useAIDebugMock({
  uiStore,
  expandedToolCallIds
})

const {
  selectedPromptId,
  granularSelections,
  expandedKeys,
  referenceTypeLabelMap,
  activeReferences,
  getOptionsForValue,
  findNodeByValue,
  toggleContext,
  toggleGranularItem,
  toggleSelectAll,
  removeReference,
  syncCategorySelection,
  addCurrentEntityToReference,
  canReferenceCurrent,
  expandActiveKeys
} = useAIReferences({
  aiStore,
  characterStore,
  worldviewStore,
  uiStore,
  router
})

const {
  atMenu,
  atScrollContainer1,
  atScrollContainer2,
  filteredAtInstances,
  handleAtInput,
  selectAtType,
  handleAtBlur,
  confirmAtReference,
  closeAtMenu,
  handleAtKeydown
} = useAIMentionMenu({
  aiStore,
  input,
  inputAreaRef,
  syncCategorySelection
})

function scrollHistoryToBottom() {
  if (historyBox.value) {
    historyBox.value.scrollTop = historyBox.value.scrollHeight
    isHistoryPinnedToBottom.value = true
  }
}

function isHistoryNearBottom(threshold = 24) {
  const box = historyBox.value
  if (!box) return true

  const distanceToBottom = box.scrollHeight - (box.scrollTop + box.clientHeight)
  return distanceToBottom <= threshold
}

async function syncHistoryScrollIfNeeded(force = false) {
  await nextTick()
  if (force || keepAtBottomDuringCurrentOutput.value || isDebugMockMode.value) {
    scrollHistoryToBottom()
  }
}

function handleHistoryScroll() {
  isHistoryPinnedToBottom.value = isHistoryNearBottom()
}

function jumpToBottom() {
  if (aiStore.isProcessing) {
    keepAtBottomDuringCurrentOutput.value = true
  }
  scrollHistoryToBottom()
}

function resetDebugMockPreview() {
  resetDebugMockPreviewInternal(() => {
    scrollHistoryToBottom()
  })
}

async function toggleDebugMockMode() {
  isDebugMockMode.value = !isDebugMockMode.value
  activePanel.value = null
  closeAtMenu()

  if (isDebugMockMode.value) {
    input.value = ''
    selectedPromptId.value = ''
    resetDebugMockPreview()
    await nextTick()
    scrollHistoryToBottom()
    uiStore.showToast('已开启 UI 调试预览', 'success')
    return
  }

  expandedToolCallIds.clear()
  await nextTick()
  scrollHistoryToBottom()
  uiStore.showToast('已退出 UI 调试预览', 'info')
}

const displayHistory = computed(() => isDebugMockMode.value ? debugMockHistory.value : aiStore.history)
const isAssistantBusy = computed(() => !isDebugMockMode.value && aiStore.isProcessing)
const showThinkingBubble = computed(() => {
  if (!isAssistantBusy.value) return false
  const lastMsg = aiStore.history[aiStore.history.length - 1]
  return !aiStore.history.length || (lastMsg.role !== 'assistant' || (!lastMsg.content?.trim() && !lastMsg.toolCalls?.length))
})

const latestAssistantMessage = computed(() => {
  const items = displayHistory.value
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]
    if (item.role === 'assistant') return item
  }
  return null
})

const latestAssistantMessageId = computed(() => latestAssistantMessage.value?.id || '')

const latestErrorMessageId = computed(() => {
  const items = displayHistory.value
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]
    if (item.role === 'assistant' && item.isError && item.retryParams) {
      return item.id
    }
  }
  return ''
})

const latestFailedMessageId = computed(() => {
  const lastAssistant = latestAssistantMessage.value
  if (lastAssistant?.isError && lastAssistant.retryParams) {
    return lastAssistant.id
  }
  return ''
})

function shouldShowInlineRetry(messageId: string) {
  if (aiStore.isProcessing) return false
  if (!latestErrorMessageId.value) return false
  if (messageId !== latestErrorMessageId.value) return false
  return messageId !== latestAssistantMessageId.value
}

const showOutputStatusIndicator = computed(() => {
  if (isDebugMockMode.value) return false
  return aiStore.outputStatus !== 'idle'
})

const showScrollToBottomButton = computed(() => {
  if (activePanel.value) return false
  if (!displayHistory.value.length) return false
  return !isHistoryPinnedToBottom.value
})

function isToolExecuted(callId: string) {
  return isDebugMockMode.value
    ? debugExecutedToolCallIds.has(callId)
    : aiStore.executedToolCallIds.has(callId)
}

function toggleExpandedToolCall(callId: string) {
  if (expandedToolCallIds.has(callId)) {
    expandedToolCallIds.delete(callId)
    return
  }
  expandedToolCallIds.add(callId)
}

const executionMode = computed({
  get: () => aiStore.executionMode,
  set: (val) => {
    aiStore.executionMode = val
  }
})

const selectedPromptLabel = computed(() => {
  if (!selectedPromptId.value) return ''
  return aiStore.allPrompts.find(item => item.id === selectedPromptId.value)?.label || ''
})

function renderMarkdown(content: string): string {
  try {
    return marked.parse(content || '', { async: false }) as string
  } catch (e) {
    return content
  }
}

const {
  readOnlyTools,
  formatArgs,
  getToolResultForCall,
  isToolRejected,
  isToolFailed,
  getToolSummary,
  handleApplyTool,
  handleRejectTool
} = useAIToolExecution({
  aiStore,
  projectStore,
  characterStore,
  outlineStore,
  worldviewStore,
  uiStore,
  displayHistory,
  expandedToolCallIds,
  isDebugMockMode,
  debugEntityNameMap,
  applyDebugTool,
  rejectDebugTool
})

const { composePrompt } = useAIPromptComposer({
  aiStore,
  activeReferences,
  selectedPromptId,
  referenceTypeLabelMap
})

const { startResize } = usePanelResize({
  containerRef,
  uiStore
})

async function send() {
  if (isDebugMockMode.value) {
    uiStore.showToast('请先关闭 UI 调试预览，再发送真实消息', 'info')
    return
  }

  if (!input.value.trim() || aiStore.isProcessing) return

  const userContent = input.value.trim()
  const fullPrompt = composePrompt(userContent)
  input.value = ''

  await aiStore.sendMessage(userContent, fullPrompt)
  selectedPromptId.value = ''
  aiStore.referenceKeys = []
  aiStore.granularSelections = {}
}

function handleSendAction() {
  if (aiStore.isProcessing) {
    aiStore.stopGeneration()
    return
  }

  void send()
}

async function retryLatestFailed() {
  if (!latestFailedMessageId.value) return
  await aiStore.retryMessage(latestFailedMessageId.value)
}

watch(() => aiStore.isVisible, async (val) => {
  if (val) {
    // 处理待定输入
    if (aiStore.pendingInput) {
      input.value = aiStore.pendingInput
      aiStore.pendingInput = '' // 消费后清除
    }
    
    // 展开所有被激活的精细化类目
    expandActiveKeys()

    // 每一打开都滚动到底部
    await nextTick()
    scrollHistoryToBottom()
  }
})

watch(() => aiStore.isProcessing, async (processing, previous) => {
  if (processing && !previous) {
    keepAtBottomDuringCurrentOutput.value = isHistoryNearBottom()
    isHistoryPinnedToBottom.value = keepAtBottomDuringCurrentOutput.value
    return
  }

  if (!processing && previous) {
    if (keepAtBottomDuringCurrentOutput.value) {
      await syncHistoryScrollIfNeeded(true)
    }
    keepAtBottomDuringCurrentOutput.value = false
  }
})

watch(
  () => {
    const items = displayHistory.value
    const last = items[items.length - 1]
    return [
      items.length,
      last?.id || '',
      last?.content?.length || 0,
      last?.toolCalls?.length || 0,
      last?.toolResults?.length || 0,
      last?.isError ? 1 : 0,
      aiStore.isProcessing ? 1 : 0,
      isDebugMockMode.value ? 1 : 0
    ].join('|')
  },
  async () => {
    await syncHistoryScrollIfNeeded()
  }
)

async function copyContent(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    uiStore.showToast('已复制到剪贴板', 'success')
  } catch (err) {
    uiStore.showToast('复制失败', 'error')
  }
}
</script>

<style scoped>
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
  width: 0 !important;
  opacity: 0;
}

</style>
