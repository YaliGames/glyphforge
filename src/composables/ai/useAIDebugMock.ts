import { nextTick, reactive, ref } from 'vue'
import type { AIHistoryItem, AIToolCall, AIToolResult } from '@/types'
import type { useUIStore } from '@/store/ui'

interface UseAIDebugMockOptions {
  uiStore: ReturnType<typeof useUIStore>
  expandedToolCallIds: Set<string>
}

const DEBUG_ENTITY_NAME_MAP: Record<string, Record<string, string>> = {
  character: {
    'char-01': '乔伊斯',
    'char-02': '维罗妮卡',
    'char-03': '执灯人'
  },
  chapters: {
    'ch-01': '第一章：圣光塔',
    'ch-02': '第二章：回声长廊'
  },
  worldview: {
    'world-01': '圣光信仰',
    'world-02': '塔城秩序'
  }
}

const DEBUG_EXECUTED_TOOL_CALL_IDS = [
  'search-1',
  'list-1',
  'detail-1',
  'upsert-1',
  'schema-1'
]

const DEBUG_EXPANDED_TOOL_CALL_IDS = [
  'search-1',
  'list-1',
  'detail-1',
  'upsert-1',
  'schema-1',
  'edit-1'
]

function createDebugToolCall(id: string, name: string, args: Record<string, any>): AIToolCall {
  return {
    id,
    type: 'function',
    function: {
      name,
      arguments: JSON.stringify(args)
    }
  }
}

function createDebugToolResult(toolCallId: string, payload: Record<string, any>): AIToolResult {
  return {
    toolCallId,
    content: JSON.stringify(payload, null, 2)
  }
}

function createDebugMockHistory(): AIHistoryItem[] {
  const now = Date.now()

  return [
    {
      id: 'debug-user-1',
      role: 'user',
      content: '请帮我梳理“圣光塔”相关设定，并看看乔伊斯能否作为第一章核心视角。',
      type: 'text',
      selectedReferences: [
        { type: 'character', id: 'char-01', label: '角色: 乔伊斯' },
        { type: 'chapters', id: 'ch-01', label: '章节: 第一章：圣光塔' }
      ],
      timestamp: now
    },
    {
      id: 'debug-assistant-1',
      role: 'assistant',
      content: `## 综合分析

首先搜索了正文中的"圣光"关键词，共发现102个相关段落。

**获取角色列表完成。** 现在查看乔伊斯的详细信息，然后进行相应的更新。

**分析完成。** 建议更新乔伊斯的角色定义，强化她的核心身份。

让我先查询数据字段**定义，然后尝试编辑正文内容。`,
      type: 'text',
      toolCalls: [
        createDebugToolCall('search-1', 'searchEntities', { type: 'manuscript', query: '圣光' }),
        createDebugToolCall('list-1', 'getEntityList', { type: 'character' }),
        createDebugToolCall('detail-1', 'getEntityDetail', { type: 'character', ids: ['char-01'] }),
        createDebugToolCall('upsert-1', 'upsertEntities', { entities: [{ type: 'character', id: 'char-01', name: '乔伊斯' }] }),
        createDebugToolCall('schema-1', 'getEntitySchema', { type: 'character' }),
        createDebugToolCall('edit-1', 'editTextBlock', { search_text: '乔伊斯踏入', replacement_text: '乔伊斯小心翼翼踏入' })
      ],
      timestamp: now + 1
    },
    {
      id: 'debug-tool-1',
      role: 'tool',
      content: '',
      type: 'text',
      toolResults: [
        createDebugToolResult('search-1', {
          status: 'success',
          data: {
            type: 'manuscript',
            query: '圣光',
            count: 102,
            results: [
              { text: '圣光塔顶升起苍白的火焰', location: 'ch-01:p5' },
              { text: '圣光沿着穹顶裂缝倾泻而下', location: 'ch-01:p12' }
            ],
            hasMore: true
          },
          message: '检索到 102 个匹配项。'
        }),
        createDebugToolResult('list-1', {
          status: 'success',
          data: {
            type: 'character',
            entities: [
              { id: 'char-01', type: 'character', name: '乔伊斯' },
              { id: 'char-02', type: 'character', name: '维罗妮卡' },
              { id: 'char-03', type: 'character', name: '执灯人' }
            ]
          },
          message: '已获取 3 个角色'
        }),
        createDebugToolResult('detail-1', {
          status: 'success',
          data: {
            type: 'character',
            entities: [{ id: 'char-01', type: 'character', name: '乔伊斯', tags: ['圣光', '调查员'] }]
          },
          message: '成功拉取 1 个实体的详情'
        }),
        createDebugToolResult('upsert-1', {
          status: 'success',
          data: {
            created: [],
            updated: [{ id: 'char-01', type: 'character' }]
          },
          message: '已成功更新 1 个角色'
        }),
        createDebugToolResult('schema-1', {
          status: 'success',
          data: {
            type: 'character',
            fields: ['name', 'age', 'background', 'tags']
          },
          message: '已获取字段定义'
        }),
        createDebugToolResult('edit-1', {
          status: 'error',
          data: { error: 'Text not found' },
          message: '未找到匹配文本'
        })
      ],
      timestamp: now + 2
    }
  ]
}

export function useAIDebugMock(options: UseAIDebugMockOptions) {
  const isDebugMockMode = ref(false)
  const debugMockHistory = ref<AIHistoryItem[]>([])
  const debugExecutedToolCallIds = reactive(new Set<string>())

  function upsertDebugToolResult(toolCallId: string, payload: Record<string, any>) {
    const content = JSON.stringify(payload, null, 2)

    for (const msg of debugMockHistory.value) {
      if (msg.role !== 'tool' || !msg.toolResults) continue

      const index = msg.toolResults.findIndex(result => result.toolCallId === toolCallId)
      if (index !== -1) {
        msg.toolResults[index] = { toolCallId, content }
        return
      }
    }

    const lastToolMsg = [...debugMockHistory.value].reverse().find(msg => msg.role === 'tool')
    if (lastToolMsg) {
      lastToolMsg.toolResults = [...(lastToolMsg.toolResults || []), { toolCallId, content }]
      return
    }

    debugMockHistory.value.push({
      id: `debug-tool-${Date.now()}`,
      role: 'tool',
      content: '',
      type: 'text',
      toolResults: [{ toolCallId, content }],
      timestamp: Date.now()
    })
  }

  function resetDebugMockPreview(onAfterReset?: () => void) {
    debugMockHistory.value = createDebugMockHistory()
    debugExecutedToolCallIds.clear()
    DEBUG_EXECUTED_TOOL_CALL_IDS.forEach(id => debugExecutedToolCallIds.add(id))
    options.expandedToolCallIds.clear()
    DEBUG_EXPANDED_TOOL_CALL_IDS.forEach(id => options.expandedToolCallIds.add(id))

    nextTick(() => {
      onAfterReset?.()
    })
  }

  function applyDebugTool(call: AIToolCall) {
    debugExecutedToolCallIds.add(call.id)
    options.expandedToolCallIds.delete(call.id)
    upsertDebugToolResult(call.id, {
      status: 'success',
      message: '调试预览：已模拟执行该操作。'
    })
    options.uiStore.showToast('调试预览：已模拟执行', 'success')
  }

  function rejectDebugTool(call: AIToolCall) {
    debugExecutedToolCallIds.add(call.id)
    options.expandedToolCallIds.delete(call.id)
    upsertDebugToolResult(call.id, {
      status: 'rejected',
      message: '调试预览：已模拟拒绝该操作。'
    })
    options.uiStore.showToast('调试预览：已模拟拒绝', 'info')
  }

  return {
    isDebugMockMode,
    debugMockHistory,
    debugExecutedToolCallIds,
    debugEntityNameMap: DEBUG_ENTITY_NAME_MAP,
    resetDebugMockPreview,
    applyDebugTool,
    rejectDebugTool
  }
}
