import { defineStore } from 'pinia'
import { ref, watch, computed, reactive } from 'vue'
import type { AIPrompt, AIHistoryItem, AIToolCall, AIToolResult, AIExecutionMode, AIReference } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { useProjectStore } from './project'
import { useSettingsStore } from './settings'
import { useUIStore } from './ui'
import { useCharacterStore } from './characters'
import { useOutlineStore } from './outline'
import { useWorldviewStore } from './worldview'
import { BUILTIN_PROMPTS, MAX_TOOL_OUTPUT_LENGTH } from '@/core/ai/constants'
import { AI_TOOLS, READ_ONLY_TOOLS, getTool, type ToolContext } from '@/core/ai/tools'
import { PromptAssembler } from '@/core/ai/prompts/assembler'
import { STORAGE_KEYS } from '@/config'

export const useAIStore = defineStore('ai', () => {
  const isVisible = ref(false)
  const isProcessing = ref(false)
  const history = ref<AIHistoryItem[]>([])
  const referenceKeys = ref<string[]>([])
  const selectedPromptId = ref<string>('')
  const granularSelections = ref<Record<string, any[]>>({})
  const pendingInput = ref<string>('')
  const executedToolCallIds = reactive(new Set<string>()) // 记录已执行过的工具调用 ID
  const executionMode = ref<AIExecutionMode>('chat')
  const activeReferences = ref<AIReference[]>([])

  // 用户自定义提示词，从 localStorage 加载
  const customPrompts = ref<AIPrompt[]>(JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_PROMPTS) || '[]'))

  // 监听自定义提示词变化并保存
  watch(customPrompts, (val) => {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PROMPTS, JSON.stringify(val))
  }, { deep: true })

  // 合并内置和自定义提示词
  const allPrompts = computed(() => [...BUILTIN_PROMPTS, ...customPrompts.value])

  // 辅助函数：根据不同的上下文 Key 获取可选列表 (内部调用)
  function getContextOptions(key: string) {
    const projectStore = useProjectStore()
    const uiStore = useUIStore()
    if (!projectStore.bundle) return []

    if (key === 'chapters' || key === 'manuscript') {
      const options: any[] = []

      // 如果是正文类型，且存在编辑器选区，则注入一个特殊的选区选项
      if (key === 'manuscript' && uiStore.editorSelection) {
        options.push({
          id: {
            start: uiStore.editorSelection.startLine,
            end: uiStore.editorSelection.endLine,
            label: `选区: ${uiStore.editorSelection.startLine}-${uiStore.editorSelection.endLine}`
          },
          label: `当前选区 (${uiStore.editorSelection.startLine}-${uiStore.editorSelection.endLine})`
        })
      }

      const flatten = (items: any[]) => {
        items.forEach(c => {
          if (key === 'chapters' || c.type === 'chapter' || c.type === 'scene') {
            options.push({ id: c.id, label: c.title })
          }
          if (c.children) flatten(c.children)
        })
      }
      flatten(projectStore.bundle.chapters)
      return options
    }

    if (key === 'character') {
      return projectStore.bundle.characters.map(c => ({ id: c.id, label: c.base.name }))
    }

    if (key === 'worldview') {
      return projectStore.bundle.worldview.categories.map(c => ({ id: c.type, label: c.name }))
    }

    if (key === 'timeline') {
      return projectStore.bundle.worldview.timeline.map(e => ({ id: e.id, label: e.title }))
    }

    if (key === 'acts' || key === 'outline') {
      const options: any[] = []

      if (key === 'outline' && uiStore.editorSelection) {
        options.push({
          id: {
            start: uiStore.editorSelection.startLine,
            end: uiStore.editorSelection.endLine,
            label: `选区: ${uiStore.editorSelection.startLine}-${uiStore.editorSelection.endLine}`
          },
          label: `当前选区 (${uiStore.editorSelection.startLine}-${uiStore.editorSelection.endLine})`
        })
      }

      options.push(...projectStore.bundle.outline.structure.acts.map(a => ({ id: a.id, label: a.title })))
      return options
    }

    return []
  }

  function updatePrompt(id: string, updates: Partial<AIPrompt>) {
    // 首先尝试在自定义提示词中查找
    const idx = customPrompts.value.findIndex(p => p.id === id)
    if (idx !== -1) {
      customPrompts.value[idx] = { ...customPrompts.value[idx], ...updates }
    }
  }

  function addPrompt(prompt: Partial<AIPrompt>) {
    const newPrompt: AIPrompt = {
      id: uuidv4(),
      label: prompt.label || '新提示词',
      description: prompt.description || '输入描述...',
      content: prompt.content || '请输入指令，可用 [REFERENCES] 和 [USER_INPUT] 标记位置',
      category: (prompt.category as any) || 'general'
    }
    customPrompts.value.push(newPrompt)
    return newPrompt
  }

  function deletePrompt(id: string) {
    customPrompts.value = customPrompts.value.filter(p => p.id !== id)
  }

  function toggle() {
    isVisible.value = !isVisible.value
  }

  /**
   * 执行工具调用 (含只读工具的自动实现)
   */
  async function executeTool(call: AIToolCall): Promise<AIToolResult> {
    const projectStore = useProjectStore()
    const characterStore = useCharacterStore()
    const outlineStore = useOutlineStore()
    const worldviewStore = useWorldviewStore()
    const uiStore = useUIStore()

    const name = call.function.name
    const rawArgs = call.function.arguments || '{}'
    let args: any = {}

    try {
      args = JSON.parse(rawArgs)
    } catch (e) {
      console.warn(`[AI Tool Engine] JSON parse error for ${name}, attempting simple fix:`, e)
      let fixed = rawArgs.trim()
      const quoteCount = (fixed.match(/"/g) || []).length
      if (quoteCount % 2 !== 0) fixed += '"'
      if (fixed.endsWith(':')) fixed += '""'
      else if (fixed.endsWith(',')) fixed = fixed.slice(0, -1)
      if (fixed.startsWith('{') && !fixed.endsWith('}')) fixed += '}'

      try {
        args = JSON.parse(fixed)
      } catch (e2) {
        console.error(`[AI Tool Engine] Recursive JSON parse failure:`, e2)
        return { toolCallId: call.id, content: `Error: Invalid JSON arguments for ${name}. Raw: ${rawArgs}` }
      }
    }

    const tool = getTool(name);
    if (!tool) {
      return { toolCallId: call.id, content: `Error: Tool ${name} not found in registry.` };
    }

    // 只读工具处理
    if (tool.isReadOnly) {
      console.group(`[AI Tool Engine] Executing Read-only: ${name}`);
      console.log('Arguments:', args);

      try {
        const context: ToolContext = { projectStore, characterStore, outlineStore, worldviewStore, uiStore };
        const resultData = await tool.execute(args, context);

        let content = typeof resultData === 'string' ? resultData : JSON.stringify(resultData);

        // --- 结果保护 ---
        if (content.length > MAX_TOOL_OUTPUT_LENGTH) {
          const originalLength = content.length;
          content = content.slice(0, MAX_TOOL_OUTPUT_LENGTH) +
            `\n\n... (内容过长已截断，共 ${originalLength} 字符)\n` +
            `[系统保护提示：数据量过大，已自动截断。]`;
          console.warn(`[AI Tool Engine] Result for ${name} truncated: ${originalLength} -> ${MAX_TOOL_OUTPUT_LENGTH}`);
        }

        console.log('Result:', resultData);
        console.groupEnd();
        return { toolCallId: call.id, content };
      } catch (e: any) {
        console.error('Execution Error:', e);
        console.groupEnd();
        return { toolCallId: call.id, content: `Error: ${e.message}` }
      }
    }

    // 写入型工具由 UI 处理 (AIAssistant.vue) 或稍候在 executeTool 中统一分发
    console.log(`[AI Tool Engine] Tool ${name} is a Write-tool, pending confirmation.`);
    return { toolCallId: call.id, content: 'TOOL_PENDING_USER_CONFIRM' }
  }

  /**
   * 中止 AI 生成
   */
  function stopGeneration() {
    const electronAPI = (window as any).electronAPI
    if (electronAPI?.aiAbort) {
      electronAPI.aiAbort()
    }
    isProcessing.value = false
  }

  /**
   * 展示 AI 助手
   * @param options.granular 配置上下文。支持 Record<key, ID数组 | 'all' | boolean>
   *        - 'all': 自动填入该分类下所有项
   *        - true: 启用该分类（主要针对非精细化的分类）
   */
  function show(options?: {
    promptId?: string,
    granular?: Record<string, string[] | 'all' | boolean>,
    references?: AIReference[],
    mode?: AIExecutionMode,
    input?: string
  }) {
    if (options?.promptId) selectedPromptId.value = options.promptId
    if (options?.input) pendingInput.value = options.input
    if (options?.mode) executionMode.value = options.mode
    if (options?.references) activeReferences.value = options.references

    if (options?.granular) {
      const resolvedGranular: Record<string, string[]> = {}
      const activeKeys: string[] = []

      for (const [key, value] of Object.entries(options.granular)) {
        if (value === false) continue

        activeKeys.push(key)

        if (value === 'all' || value === true) {
          // 如果是精细化分类，'all' 或 true 都解析为全选；对于非精细化分类，true 仅表示激活
          const options = getContextOptions(key)
          resolvedGranular[key] = options.length > 0 ? options.map(o => o.id) : []
        } else if (Array.isArray(value)) {
          resolvedGranular[key] = value
        } else {
          resolvedGranular[key] = []
        }
      }

      granularSelections.value = resolvedGranular
      referenceKeys.value = activeKeys
    }

    isVisible.value = true
  }

  function addHistory(
    role: 'user' | 'assistant' | 'tool' | 'system',
    content: string,
    type: 'text' | 'json' = 'text',
    options?: {
      references?: Record<string, any>,
      selectedReferences?: AIReference[],
      toolCalls?: AIToolCall[],
      toolResults?: AIToolResult[]
    }
  ) {
    history.value.push({
      id: uuidv4(),
      role,
      content,
      type,
      references: options?.references,
      selectedReferences: options?.selectedReferences,
      toolCalls: options?.toolCalls,
      toolResults: options?.toolResults,
      timestamp: Date.now()
    })
  }

  function clearHistory() {
    history.value = []
  }

  /**
   * 真正的发送逻辑
   */
  async function sendMessage(displayContent: string, fullPrompt: string, references?: Record<string, any>, isLoop = false) {
    const settingsStore = useSettingsStore()
    const activeProfile = settingsStore.activeAIProfile

    if (!activeProfile) {
      addHistory('assistant', '错误：未配置有效的 AI 模型。请前往设置页面配置。')
      return
    }

    isProcessing.value = true

    // 非循环模式下，添加用户消息
    if (!isLoop) {
      addHistory('user', displayContent, 'text', {
        references,
        selectedReferences: [...activeReferences.value]
      })
    }

    // 创建助理回复占位或复用上一条消息 (整合多次对话到同一消息块)
    let assistantMsgId: string
    let fullContent = ''
    let existingToolCalls: AIToolCall[] | undefined = undefined

    const lastMsg = history.value[history.value.length - 1]
    if (isLoop && lastMsg && lastMsg.role === 'assistant') {
      assistantMsgId = lastMsg.id
      fullContent = lastMsg.content || ''
      existingToolCalls = lastMsg.toolCalls
    } else {
      assistantMsgId = uuidv4()
      history.value.push({
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        type: 'text',
        timestamp: Date.now()
      })
    }

    try {
      let headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (activeProfile.apiKey) {
        headers['Authorization'] = `Bearer ${activeProfile.apiKey}`
      }

      // 构建消息列表
      const messages: any[] = []

      // 1. 系统角色与工具使用规范 (通过 Assembler 组装)
      const systemPrompt = PromptAssembler.assembleSystemPrompt(executionMode.value);
      messages.push({ role: 'system', content: systemPrompt })

      // 2. 处理历史记录
      history.value.forEach((item, index) => {
        if (item.role === 'user') {
          const isLatestUser = index === history.value.findLastIndex(v => v.role === 'user');
          let content = isLatestUser ? fullPrompt : item.content;

          if (isLatestUser && !isLoop) {
            content = PromptAssembler.getModeAnchor(executionMode.value) + content;
          }

          messages.push({ role: 'user', content });
        } else if (item.role === 'assistant') {
          if (item.id === assistantMsgId) return;
          
          // 历史污染防御：校验并过滤掉非法的 tool_calls，防止后端接口因无法解析历史参数而导致 400 阻塞
          let validToolCalls: AIToolCall[] | undefined = undefined;
          if (item.toolCalls && item.toolCalls.length > 0) {
            validToolCalls = item.toolCalls.filter(tc => {
              try {
                JSON.parse(tc.function.arguments);
                return true;
              } catch (e) {
                console.error(`[AI Store] 检测到历史记录中存在非法工具参数 (${tc.function.name})，已自动剔除以防止请求阻塞。`);
                return false;
              }
            });
          }

          messages.push({
            role: 'assistant',
            content: item.content || '',
            tool_calls: (validToolCalls && validToolCalls.length > 0) ? validToolCalls : undefined
          });
        } else if (item.role === 'tool') {
          if (item.toolResults) {
            item.toolResults.forEach(result => {
              messages.push({
                role: 'tool',
                tool_call_id: result.toolCallId,
                content: result.content || ''
              });
            });
          }
        }
      });

      let body: any

      // 根据执行模式过滤工具
      const availableTools = executionMode.value === 'chat'
        ? AI_TOOLS.filter(t => READ_ONLY_TOOLS.includes(t.name))
        : AI_TOOLS;

      if (activeProfile.provider === 'openai') {
        body = {
          model: activeProfile.model,
          messages,
          tools: availableTools.map(t => ({
            type: 'function',
            function: t
          })),
          tool_choice: 'auto',
          stream: true
        }
      } else if (activeProfile.provider === 'anthropic') {
        // Claude 格式处理
        headers['x-api-key'] = activeProfile.apiKey
        headers['anthropic-version'] = '2023-06-01'
        delete headers['Authorization']
        body = {
          model: activeProfile.model,
          max_tokens: 4096,
          messages: messages.filter(m => m.role !== 'system'),
          system: messages.find(m => m.role === 'system')?.content,
          tools: availableTools.map(t => ({
            name: t.name,
            description: t.description,
            input_schema: t.parameters
          }))
        }
      } else if (activeProfile.provider === 'custom') {
        // 自定义引擎：不支持工具调用，仅支持基础消息
        if (!activeProfile.template) {
          throw new Error('自定义提供商必须配置请求模板')
        }

        const payloadStr = activeProfile.template
          .replace(/\$\{model\}/g, activeProfile.model)
          .replace(/\$\{messages\}/g, JSON.stringify(messages))
          .replace(/\$\{prompt\}/g, JSON.stringify(fullPrompt))

        body = JSON.parse(payloadStr)
      }

      let toolCalls: AIToolCall[] | undefined = existingToolCalls ? JSON.parse(JSON.stringify(existingToolCalls)) : undefined
      const electronAPI = (window as any).electronAPI

      if (electronAPI?.aiRequest && electronAPI?.onAIChunk) {
        // --- Electron 流式模式 ---
        let removeListener: (() => void) | null = null;
        let lineBuffer = ''; // 用于处理跨 chunk 的行
        let watchdog: any = null;

        const promise = new Promise<void>((resolve, reject) => {
          // 设置定时器 (看门狗)：如果 30 秒没有任何数据返回，强制超时
          watchdog = setTimeout(() => {
            reject(new Error('AI 服务器响应超时 (30秒未收到数据)'));
          }, 30000);

          removeListener = electronAPI.onAIChunk((data: any) => {
            // 只要有任何数据返回（chunk），就重置计时器
            if (watchdog) {
              clearTimeout(watchdog);
              watchdog = setTimeout(() => {
                reject(new Error('流式传输中断 (15秒无后续数据)'));
              }, 15000);
            }

            if (data.type === 'chunk') {
              // ... chunk 处理逻辑 ...
              lineBuffer += data.content;
              const lines = lineBuffer.split('\n');
              lineBuffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;

                const jsonStr = trimmed.slice(6).trim();
                if (jsonStr === '[DONE]') continue;

                try {
                  const chunk = JSON.parse(jsonStr);
                  const delta = chunk.choices?.[0]?.delta;

                  if (delta?.content) {
                    fullContent += delta.content;
                    const msg = history.value.find(m => m.id === assistantMsgId);
                    if (msg) msg.content = fullContent;
                  }

                  if (delta?.tool_calls) {
                    if (!toolCalls) toolCalls = [];
                    delta.tool_calls.forEach((tc: any) => {
                      const existing = toolCalls!.find(e => e.index === tc.index);
                      if (existing) {
                        if (tc.function?.arguments) {
                          existing.function.arguments += tc.function.arguments;
                        }
                      } else {
                        toolCalls!.push({
                          id: tc.id || '',
                          type: 'function',
                          index: tc.index,
                          function: {
                            name: tc.function?.name || '',
                            arguments: tc.function?.arguments || ''
                          }
                        });
                        if (tc.function?.arguments) {
                          toolCalls![toolCalls!.length - 1].function.arguments += tc.function.arguments;
                        }
                      }
                    });
                    const msg = history.value.find(m => m.id === assistantMsgId);
                    if (msg) msg.toolCalls = JSON.parse(JSON.stringify(toolCalls));
                  }
                } catch (e) { }
              }
            } else if (data.type === 'done') {
              if (watchdog) clearTimeout(watchdog);
              resolve();
            }
          });
        });

        try {
          // 使用 Promise.race 确保无论请求本身挂死，还是流式中断，都能触发超时
          await Promise.race([
            (async () => {
              const result = await electronAPI.aiRequest(activeProfile.endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
              });

              if (!result.ok) {
                const errDetail = typeof result.error === 'object' ? (result.error.message || JSON.stringify(result.error)) : result.error;
                throw new Error(errDetail || '请求发送失败');
              }

              // 请求成功发出后，继续等待流式数据结束
              await promise;
            })(),
            promise // 只要 promise (含 watchdog) reject，整个 race 就会提前 reject
          ]);
        } finally {
          if (watchdog) clearTimeout(watchdog);
          if (removeListener) (removeListener as Function)();
        }

      } else {
        // --- 非流式/Web 模式 (降级处理) ---
        const response = await fetch(activeProfile.endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(body)
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.error?.message || errData.message || `请求失败: ${response.status}`)
        }

        const data = await response.json()
        if (activeProfile.provider === 'openai') {
          const message = data.choices?.[0]?.message
          fullContent = message?.content || ''
          toolCalls = message?.tool_calls
        }

        const msg = history.value.find(m => m.id === assistantMsgId);
        if (msg) {
          msg.content = fullContent;
          msg.toolCalls = toolCalls as any;
        }
      }

      // 修正工具调用的 JSON 类型或其他状态
      const finalMsg = history.value.find(m => m.id === assistantMsgId);
      if (finalMsg && fullContent.trim().startsWith('{') && fullContent.trim().endsWith('}')) {
        finalMsg.type = 'json';
      }

      // --- 工具调用参数清洗逻辑 ---
      if (finalMsg && finalMsg.toolCalls) {
        finalMsg.toolCalls.forEach(tc => {
          try {
            // 仅修复结构性错误，严禁手工进行 Unicode 反转义或字符串替换，否则会破坏 JSON 结构
            let rawArgs = tc.function.arguments || '{}';

            // 错误 1: ["item"] 被输出为 "['item']" (字符串包围的 Python 列表)
            if (/"ids":\s*"\[.*\]"/.test(rawArgs)) {
              rawArgs = rawArgs.replace(/"ids":\s*"(\[.*\])"/, (_, group) => {
                const fixedArr = group.replace(/'/g, '"');
                return ` "ids": ${fixedArr}`;
              });
            }

            // 更新修复后的参数
            tc.function.arguments = rawArgs;
          } catch (e) {
            console.warn('Failed to pre-clean tool arguments:', e);
          }
        });
      }

      // 如果有工具调用，触发自动执行或 UI 逻辑
      if (toolCalls && toolCalls.length > 0) {
        const readOnlyNames = ['getEntityList', 'getEntitySchema', 'getEntityDetail', 'searchEntities', 'getRelationGraph'];

        // 1. 识别并执行只读工具
        const autoCalls = toolCalls.filter(tc => readOnlyNames.includes(tc.function.name));

        if (autoCalls.length > 0) {
          console.log(`[AI Store] Auto-executing ${autoCalls.length} read-only tools...`);
          const results = await Promise.all(autoCalls.map(tc => executeTool(tc)));

          // 2. 将结果写入历史 (作为一个 tool 角色消息，内容为空以便 UI 隐藏或整合)
          addHistory('tool', '', 'text', {
            toolResults: results
          });

          // 3. 如果所有工具调用都已执行，自动驱动下一轮生成
          if (autoCalls.length === toolCalls.length) {
            console.log('[AI Store] All tools executed, jumping to next loop.');
            // 递归调用，带上 isLoop=true 避免重复添加 user 消息
            await sendMessage('', fullPrompt, undefined, true);
          }
        }
      }

    } catch (error: any) {
      console.error('[AI Error]', error)
      stopGeneration() // 关键：发生任何错误（含超时）时，立即通知 API 终止后端请求并重置状态

      // 如果错误已经被处理过（在递归调用的深层已记录到消息中），则直接向上抛出，避免父级重复记录
      if (error._handled) throw error;
      error._handled = true;

      const assistantMsg = history.value.find(m => m.id === assistantMsgId)
      if (assistantMsg) {
        assistantMsg.content = `抱歉，请求模型时出错：${error.message || error}`
        assistantMsg.type = 'error' as any
        assistantMsg.isError = true
        // 存储重试参数，即使是 Loop 模式，我们也存储最初触发该序列的参数
        assistantMsg.retryParams = { displayContent, fullPrompt, references }
      }
      throw error // 重新抛出错误，确保 UI 组件（如 AIAssistant.vue）可以捕获到异常并显示全局提示（Tips）
    } finally {
      // 只有在非循环或最终完成时才重置处理状态
      // 注意：如果是递归调用，sendMessage 内部会再次设置 isProcessing=true
      // 为了平滑过渡，只有当 history 中最后一个消息不是待处理的 tool 结果时才重置
      const lastMsg = history.value[history.value.length - 1];
      if (lastMsg.role !== 'tool') {
        isProcessing.value = false
      }
    }
  }

  async function retryMessage(msgId: string) {
    const index = history.value.findIndex(m => m.id === msgId)
    if (index === -1) return

    // 移除出错的消息块
    history.value.splice(index, 1)

    await sendMessage('重试', '重试', undefined, false)
  }

  return {
    isVisible,
    isProcessing,
    history,
    referenceKeys,
    selectedPromptId,
    granularSelections,
    pendingInput,
    executedToolCallIds,
    executionMode,
    activeReferences,
    customPrompts,
    allPrompts,
    updatePrompt,
    addPrompt,
    deletePrompt,
    toggle,
    show,
    getContextOptions,
    addHistory,
    clearHistory,
    sendMessage,
    retryMessage,
    stopGeneration
  }
})
