import { watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { AIHistoryItem, AIToolCall, AIToolResult } from '@/types'
import { AI_TOOLS, READ_ONLY_TOOLS, getTool } from '@/core/ai/tools'
import type { useAIStore } from '@/store/ai'
import type { useProjectStore } from '@/store/project'
import type { useCharacterStore } from '@/store/characters'
import type { useOutlineStore } from '@/store/outline'
import type { useWorldviewStore } from '@/store/worldview'
import type { useUIStore } from '@/store/ui'

interface UseAIToolExecutionOptions {
  aiStore: ReturnType<typeof useAIStore>
  projectStore: ReturnType<typeof useProjectStore>
  characterStore: ReturnType<typeof useCharacterStore>
  outlineStore: ReturnType<typeof useOutlineStore>
  worldviewStore: ReturnType<typeof useWorldviewStore>
  uiStore: ReturnType<typeof useUIStore>
  displayHistory: ComputedRef<AIHistoryItem[]>
  expandedToolCallIds: Set<string>
  isDebugMockMode: Ref<boolean>
  debugEntityNameMap: Record<string, Record<string, string>>
  applyDebugTool: (call: AIToolCall) => void
  rejectDebugTool: (call: AIToolCall) => void
}

const ENTITY_TYPE_LABEL: Record<string, string> = {
  character: '角色',
  worldview: '世界观',
  relationship: '关系',
  timeline: '时间线',
  chapters: '章节',
  manuscript: '正文'
}

function truncate(text: string, maxLen: number, suffix = '...') {
  return text.length > maxLen ? text.slice(0, maxLen) + suffix : text
}

function entityTypeLabel(type: string) {
  return ENTITY_TYPE_LABEL[type] ?? type
}

export function useAIToolExecution(options: UseAIToolExecutionOptions) {
  const {
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
  } = options

  const readOnlyTools = READ_ONLY_TOOLS

  watch(() => aiStore.history, (newHistory) => {
    const lastMsg = newHistory[newHistory.length - 1]
    if (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.toolCalls) return

    lastMsg.toolCalls.forEach(call => {
      if (!readOnlyTools.includes(call.function.name) && !aiStore.executedToolCallIds.has(call.id)) {
        expandedToolCallIds.add(call.id)
      }
    })
  }, { deep: true })

  function getToolLabel(name: string) {
    const tool = AI_TOOLS.find(item => item.name === name)
    return tool?.description.split('：')[0] || name
  }

  function formatArgs(raw: string) {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2)
    } catch {
      return raw
    }
  }

  function getToolResultForCall(callId: string): AIToolResult | null {
    for (const msg of displayHistory.value) {
      if (msg.role !== 'tool' || !msg.toolResults) continue
      const found = msg.toolResults.find(result => result.toolCallId === callId)
      if (found) return found
    }
    return null
  }

  function isToolRejected(callId: string) {
    const result = getToolResultForCall(callId)
    if (!result) return false

    try {
      const data = JSON.parse(result.content)
      return data.status === 'rejected'
    } catch {
      return false
    }
  }

  function isToolFailed(callId: string) {
    const result = getToolResultForCall(callId)
    if (!result) return false

    try {
      const data = JSON.parse(result.content)
      return data.status === 'error'
    } catch {
      return false
    }
  }

  function resolveEntityDisplayId(type: string, id: string) {
    const optionsForType = aiStore.getContextOptions(type) as any[]
    const option = optionsForType.find(item => item.id === id)
    return option?.label ?? debugEntityNameMap[type]?.[id] ?? id
  }

  function getToolSummary(call: AIToolCall): string {
    if (!call.function.arguments) return '分析意图中...'

    let args: any
    try {
      args = JSON.parse(call.function.arguments)
    } catch {
      return '解析参数中...'
    }

    try {
      switch (call.function.name) {
        case 'editTextBlock': {
          const preview = truncate(args.search_text || '', 20)
          return `修正正文中的 "${preview}"`
        }

        case 'upsertEntities': {
          const entities: any[] = args.entities || []
          if (entities.length === 0) return '同步设定'
          return entities.map(entity => {
            const label = entityTypeLabel(entity.type)
            const name = (entity.name || '').trim()
            return entity.id ? `修改${label} \`${name || entity.id}\`` : `创建${label} \`${name}\``
          }).join('、')
        }

        case 'deleteEntities': {
          const entities: any[] = args.entities || []
          if (entities.length === 0) return '删除实体'

          const previews = entities.slice(0, 3).map(entity => {
            const label = entityTypeLabel(entity.type)
            const display = resolveEntityDisplayId(entity.type, entity.id)
            return `${label} \`${display}\``
          })

          const suffix = entities.length > 3 ? ` 等 ${entities.length} 项` : ''
          return `删除 ${previews.join('、')}${suffix}`
        }

        case 'getEntityList': {
          return `获取全部${entityTypeLabel(args.type)}`
        }

        case 'getEntityDetail': {
          const label = entityTypeLabel(args.type)
          const idList: string[] = Array.isArray(args.ids) ? args.ids : (args.ids ? [args.ids] : [])
          if (idList.length === 0) return `获取${label}详细信息`

          const resolved = idList.slice(0, 3).map(id => resolveEntityDisplayId(args.type, id))
          const preview = resolved.join('、')
          const suffix = idList.length > 3 ? ` 等 ${idList.length} 个` : ' '
          return `获取${label} \`${preview}\`${suffix}详细信息`
        }

        case 'searchEntities': {
          const label = args.type ? entityTypeLabel(args.type) : '全部'
          const preview = truncate(args.query || '', 15, '....')
          let suffix = ''

          const result = getToolResultForCall(call.id)
          if (result) {
            try {
              const data = JSON.parse(result.content)
              if (data?.data?.count != null) {
                suffix = `（${data.data.count} 个结果）`
              }
            } catch {
              suffix = ''
            }
          }

          return `搜索${label}关键词 \`${preview}\`${suffix}`
        }

        case 'getRelationGraph':
          return '生成人物关系图谱'

        case 'getEntitySchema':
          return '获取字段定义'

        default:
          return call.function.name
      }
    } catch {
      return call.function.name
    }
  }

  async function checkAndContinueAILoop(messageId: string) {
    const msg = aiStore.history.find(item => item.id === messageId)
    if (!msg || !msg.toolCalls) return

    const pendingCount = msg.toolCalls.filter(toolCall => {
      return !readOnlyTools.includes(toolCall.function.name) && !aiStore.executedToolCallIds.has(toolCall.id)
    }).length

    if (pendingCount === 0) {
      await aiStore.sendMessage('', '', undefined, true)
    }
  }

  async function handleApplyTool(messageId: string, call: AIToolCall) {
    if (isDebugMockMode.value) {
      applyDebugTool(call)
      return
    }

    const toolName = call.function.name
    console.group(`[AI Tool Engine] Applying Write-Tool: ${toolName}`)

    const tool = getTool(toolName)
    if (!tool) {
      console.error(`Tool ${toolName} not found in registry.`)
      console.groupEnd()
      return
    }

    const ok = await uiStore.showConfirm({
      title: '确认执行 AI 操作',
      message: `AI 建议执行 “${getToolLabel(toolName)}”，是否继续？`,
      confirmText: '确认执行'
    })

    if (!ok) {
      console.groupEnd()
      return
    }

    try {
      let args: any

      try {
        args = JSON.parse(call.function.arguments)
      } catch (error: any) {
        let msg = 'AI 返回的指令参数格式错误'
        const posMatch = error.message.match(/at position (\d+)/) || error.message.match(/column (\d+)/)

        if (posMatch) {
          const pos = parseInt(posMatch[1])
          const text = call.function.arguments
          const start = Math.max(0, pos - 20)
          const end = Math.min(text.length, pos + 20)
          const snippet = text.substring(start, end)
          const pointer = ' '.repeat(pos - start) + '▲'
          msg += `: ${error.message}\n\nERROR CONTEXT:\n${snippet}\n${pointer}`
        } else {
          msg += `: ${error.message}`
        }

        throw new Error(msg)
      }

      projectStore.takeSnapshot()

      const context = { projectStore, characterStore, outlineStore, worldviewStore, uiStore }
      const result = await tool.execute(args, context)

      aiStore.executedToolCallIds.add(call.id)
      expandedToolCallIds.delete(call.id)

      uiStore.showToast(result.message || '操作成功', 'success')
      projectStore.markDirty()

      aiStore.addHistory('tool', result.message || '操作成功', 'text', {
        toolResults: [{
          toolCallId: call.id,
          content: JSON.stringify(result)
        }]
      })

      await checkAndContinueAILoop(messageId)
    } catch (error: any) {
      uiStore.showToast(`执行失败: ${error.message}`, 'error')

      aiStore.executedToolCallIds.add(call.id)

      aiStore.addHistory('tool', `Execution failed: ${error.message}`, 'text', {
        toolResults: [{
          toolCallId: call.id,
          content: JSON.stringify({ status: 'error', message: error.message })
        }]
      })

      await checkAndContinueAILoop(messageId)
    } finally {
      console.groupEnd()
    }
  }

  async function handleRejectTool(messageId: string, call: AIToolCall) {
    if (isDebugMockMode.value) {
      rejectDebugTool(call)
      return
    }

    const ok = await uiStore.showConfirm({
      title: '拒绝 AI 操作',
      message: `确定要拒绝执行 “${getToolLabel(call.function.name)}” 吗？\n拒绝后 AI 将得知该操作未被允许，并根据情况调整后续建议。`,
      confirmText: '确定拒绝',
      type: 'danger'
    })

    if (!ok) return

    aiStore.executedToolCallIds.add(call.id)
    expandedToolCallIds.delete(call.id)

    aiStore.addHistory('tool', 'User rejected this operation.', 'text', {
      toolResults: [{
        toolCallId: call.id,
        content: JSON.stringify({ status: 'rejected', message: 'User declined to execute this operation.' })
      }]
    })

    await checkAndContinueAILoop(messageId)
  }

  return {
    readOnlyTools,
    formatArgs,
    getToolResultForCall,
    isToolRejected,
    isToolFailed,
    getToolSummary,
    handleApplyTool,
    handleRejectTool
  }
}
