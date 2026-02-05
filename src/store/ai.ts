import { defineStore } from 'pinia'
import { ref, watch, computed, reactive } from 'vue'
import type { AIPrompt, AIHistoryItem, AIToolCall, AIToolResult } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { useProjectStore } from './project'
import { useSettingsStore } from './settings'
import { BUILTIN_PROMPTS } from '@/core/ai/constants'
import { AI_TOOLS } from '@/core/ai/tool-definitions'

const STORAGE_KEY = 'glyphforge-custom-prompts'

export const useAIStore = defineStore('ai', () => {
  const isVisible = ref(false)
  const isProcessing = ref(false)
  const history = ref<AIHistoryItem[]>([])
  const referenceKeys = ref<string[]>([])
  const selectedPromptId = ref<string>('')
  const granularSelections = ref<Record<string, string[]>>({})
  const pendingInput = ref<string>('')
  const executedToolCallIds = reactive(new Set<string>()) // 记录已执行过的工具调用 ID

  // 用户自定义提示词，从 localStorage 加载
  const customPrompts = ref<AIPrompt[]>(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))

  // 监听自定义提示词变化并保存
  watch(customPrompts, (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
  }, { deep: true })

  // 合并内置和自定义提示词
  const allPrompts = computed(() => [...BUILTIN_PROMPTS, ...customPrompts.value])

  // 辅助函数：根据不同的上下文 Key 获取可选列表 (内部调用)
  function getContextOptions(key: string) {
    const projectStore = useProjectStore()
    if (!projectStore.bundle) return []

    if (key === 'chapters' || key === 'manuscript') {
      const chapters: any[] = []
      const flatten = (items: any[]) => {
        items.forEach(c => {
          if (key === 'chapters' || c.type === 'chapter' || c.type === 'scene') {
            chapters.push({ id: c.id, label: c.title })
          }
          if (c.children) flatten(c.children)
        })
      }
      flatten(projectStore.bundle.chapters)
      return chapters
    }

    if (key === 'worldview_categories' || key === 'categories') {
      return projectStore.bundle.worldview.categories.map(c => ({ id: c.type, label: c.name }))
    }

    if (key === 'worldview_timeline' || key === 'timeline') {
      return projectStore.bundle.worldview.timeline.map(e => ({ id: e.id, label: e.title }))
    }

    if (key === 'characters') {
      return projectStore.bundle.characters.map(c => ({ id: c.id, label: c.base.name }))
    }

    if (key === 'acts' || key === 'outline') {
      return projectStore.bundle.outline.structure.acts.map(a => ({ id: a.id, label: a.title }))
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
      content: prompt.content || '请输入指令，可用 [JSON] 和 [USER_INPUT] 标记位置',
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
  function show(options?: { promptId?: string, granular?: Record<string, string[] | 'all' | boolean>, input?: string }) {
    if (options?.promptId) selectedPromptId.value = options.promptId
    if (options?.input) pendingInput.value = options.input
    
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
  async function sendMessage(displayContent: string, fullPrompt: string, references?: Record<string, any>) {
    const settingsStore = useSettingsStore()
    const activeProfile = settingsStore.activeAIProfile

    if (!activeProfile) {
      addHistory('assistant', '错误：未配置有效的 AI 模型。请前往设置页面配置。')
      return
    }

    isProcessing.value = true
    
    // 如果是对话的第一条（或者包含完整 prompt），我们需要特殊处理
    // 历史中保存 displayContent 供 UI 显示
    addHistory('user', displayContent, 'text', { references })

    // 创建一个占位的助理回复 ID，用于流式更新
    const assistantMsgId = uuidv4()
    history.value.push({
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      type: 'text',
      timestamp: Date.now()
    })

    try {
      let headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (activeProfile.apiKey) {
        headers['Authorization'] = `Bearer ${activeProfile.apiKey}`
      }

      // 构建消息列表
      const messages: any[] = []
      
      // 1. 系统角色与工具使用规范
      let systemPrompt = `你是一位极具专业素养的写作助手。

### 行为准则 ###
- **对话优先**：默认以文本回复。仅在涉及底层数据（如修改正文、更新角色设定）时调用工具。
- **参数规范**：严禁占位符。\`upsert_entities\` 的 \`entities\` 必须是标准的 JSON 对象数组。
- **环境**：始终以中文回复，直接输出中文字符。`

      messages.push({ role: 'system', content: systemPrompt })

      // 处理历史记录
      history.value.forEach((item, index) => {
        if (item.role === 'user') {
          // 区分当前发送的完整 prompt 还是历史简洁内容
          const content = (index === history.value.length - 2) ? fullPrompt : item.content;
          messages.push({ role: 'user', content });
        } else if (item.role === 'assistant') {
          if (item.id === assistantMsgId) return;
          messages.push({ role: 'assistant', content: item.content, tool_calls: item.toolCalls });
        } else if (item.role === 'tool') {
          item.toolResults?.forEach(result => {
            messages.push({ role: 'tool', tool_call_id: result.toolCallId, content: result.content });
          });
        }
      });

      let body: any

      if (activeProfile.provider === 'openai') {
        body = {
          model: activeProfile.model,
          messages,
          tools: AI_TOOLS.map(t => ({
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
          tools: AI_TOOLS.map(t => ({
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

      let toolCalls: AIToolCall[] | undefined = undefined
      let fullContent = ''
      const electronAPI = (window as any).electronAPI

      if (electronAPI?.aiRequest && electronAPI?.onAIChunk) {
        // --- Electron 流式模式 ---
        let removeListener: (() => void) | null = null;
        let lineBuffer = ''; // 用于处理跨 chunk 的行
        let watchdog: any = null;
        
        const promise = new Promise<void>((resolve, reject) => {
          // 设置看门狗：如果 30 秒没有任何数据返回，强制超时
          watchdog = setTimeout(() => {
            reject(new Error('AI 服务器响应超时 (30秒未收到数据)'));
          }, 30000);

          removeListener = electronAPI.onAIChunk((data: any) => {
            // 只要有任何数据（哪怕是 chunk），就刷新看门狗
            if (watchdog) {
              clearTimeout(watchdog);
              watchdog = setTimeout(() => {
                reject(new Error('流式传输中断 (15秒无后续数据)'));
              }, 15000);
            }

            if (data.type === 'chunk') {
              // ... 原有逻辑 ...
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
                } catch (e) {
                  // 忽略不完整的 JSON 片段，等待后续补充
                }
              }
            } else if (data.type === 'done') {
              if (watchdog) clearTimeout(watchdog);
              resolve();
            }
          });
        });

        try {
          const result = await electronAPI.aiRequest(activeProfile.endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          });

          if (!result.ok) {
            throw new Error(result.error?.message || result.error || '请求发送失败');
          }

          await promise;
        } finally {
          if (watchdog) clearTimeout(watchdog);
          if (removeListener) removeListener();
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
            // 尝试通过正则或简单的字符串替换来修复常见的 AI 参数错误
            let rawArgs = tc.function.arguments || '{}';
            
            // 错误 1: ["item"] 被输出为 "['item']" (字符串包围的 Python 列表)
            if (/"ids":\s*"\[.*\]"/.test(rawArgs)) {
               rawArgs = rawArgs.replace(/"ids":\s*"(\[.*\])"/, (match, group) => {
                 const fixedArr = group.replace(/'/g, '"');
                 return ` "ids": ${fixedArr}`;
               });
            }

            // 错误 2: Unicode 转义序列在非必要情况下被双重转义或以原始形式保留
            if (rawArgs.includes('\\\\u')) {
              rawArgs = rawArgs.replace(/\\\\u([0-9a-fA-F]{4})/g, (match, grp) => {
                return String.fromCharCode(parseInt(grp, 16));
              });
            } else if (rawArgs.includes('\\u')) {
              // 尝试直接解析
              try {
                const temp = JSON.parse(`{"t":"${rawArgs.replace(/"/g, '\\"')}"}`).t;
                if (temp) rawArgs = temp;
              } catch(e) {}
            }

            // 更新修复后的参数
            tc.function.arguments = rawArgs;
          } catch (e) {
            console.warn('Failed to pre-clean tool arguments:', e);
          }
        });
      }
      
      // 如果有工具调用，触发 UI 逻辑
      if (toolCalls && toolCalls.length > 0) {
        // TODO: 可选自动触发或显示建议卡片
      }
      
    } catch (error: any) {
      console.error('[AI Error]', error)
      addHistory('assistant', `抱歉，请求模型时出错：${error.message}`)
    } finally {
      isProcessing.value = false
    }
  }

  /**
   * 辅助函数：通过路径获取对象属性值
   */
  function getValueByPath(obj: any, path: string) {
    return path.split(/[.[\]]+/).filter(Boolean).reduce((acc, part) => {
      return acc && acc[part] !== undefined ? acc[part] : undefined
    }, obj)
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
    stopGeneration
  }
})
