import { defineStore } from 'pinia'
import { ref, watch, computed, reactive } from 'vue'
import type { AIPrompt, AIHistoryItem, AIToolCall, AIToolResult, AIExecutionMode, AIReference } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { useProjectStore } from './project'
import { useSettingsStore } from './settings'
import { useUIStore } from './ui'
import { useCharacterStore } from './characters'
import { useOutlineStore } from './outline'
import { BUILTIN_PROMPTS, MAX_TOOL_OUTPUT_LENGTH } from '@/core/ai/constants'
import { AI_TOOLS } from '@/core/ai/tool-definitions'
import { getAIExportKeys, getIdentityKeys, getTechnicalKeys, generateAISchemaManual } from '@/core/ai/schema-registry'

const STORAGE_KEY = 'glyphforge-custom-prompts'

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
   * 执行工具调用 (含只读工具的自动实现)
   */
  async function executeTool(call: AIToolCall): Promise<AIToolResult> {
    const projectStore = useProjectStore()
    const characterStore = useCharacterStore()
    const outlineStore = useOutlineStore()

    const name = call.function.name
    const rawArgs = call.function.arguments || '{}'
    let args: any = {}
    
    try {
      args = JSON.parse(rawArgs)
    } catch (e) {
      console.warn(`[AI Tool Engine] JSON parse error for ${name}, attempting simple fix:`, e)
      // 处理常见的不完整 JSON：缺少闭合括号或引号
      let fixed = rawArgs.trim()
      
      // 1. 引号配对检查
      const quoteCount = (fixed.match(/"/g) || []).length
      if (quoteCount % 2 !== 0) {
        fixed += '"'
      }
      
      // 2. 补全冒号后的空值 (形如 "id": )
      if (fixed.endsWith(':')) {
        fixed += '""'
      } else if (fixed.endsWith(',')) {
        fixed = fixed.slice(0, -1)
      }

      // 3. 闭合括号检查
      if (fixed.startsWith('{') && !fixed.endsWith('}')) fixed += '}'
      
      try {
        args = JSON.parse(fixed)
      } catch (e2) {
        console.error(`[AI Tool Engine] Recursive JSON parse failure:`, e2)
        return { toolCallId: call.id, content: `Error: Invalid JSON arguments for ${name}. Raw: ${rawArgs}` }
      }
    }

    console.group(`[AI Tool Engine] Executing Read-only: ${name}`);
    console.log('Arguments:', args);

    try {
      let resultData: any = null;

      // --- 只读工具实现 ---
      if (name === 'getEntityList') {
        const { type, fields } = args
        let list: any[] = []
        const bundle = projectStore.bundle;
        if (!bundle) throw new Error('No project bundle found');

        const pickFields = (item: any, itemType: string) => {
          let source = { ...item };
          if (source.base) {
            Object.assign(source, source.base);
            delete source.base;
          }

          const result: any = { id: source.id || source.type };
          
          // 优先确定显示名称字段
          const nameField = source.name ? 'name' : (source.title ? 'title' : (source.label ? 'label' : null));
          if (nameField) result[nameField] = source[nameField];

          if (Array.isArray(fields)) {
            fields.forEach(f => {
              if (source[f] !== undefined && f !== 'id' && f !== nameField) {
                result[f] = source[f];
              }
            });
          }
          return result;
        };

        if (type === 'character') {
          list = (bundle.characters || []).map(c => pickFields(c, 'character'))
        } else if (type === 'relationship') {
          list = (bundle.relationships || []).map(r => pickFields(r, 'relationship'))
        } else if (type === 'outline') {
          list = (bundle.outline?.structure.acts || []).map(a => pickFields(a, 'outline'))
        } else if (type === 'worldview') {
          list = (bundle.worldview?.categories || []).map(c => pickFields(c, 'worldview'))
        } else if (type === 'timeline') {
          list = (bundle.worldview?.timeline || []).map(e => pickFields(e, 'timeline'))
        } else if (type === 'chapters' || type === 'manuscript') {
          const chapters: any[] = []
          const flatten = (items: any[]) => {
            items.forEach(c => {
              if (c.type === 'chapter' || c.type === 'scene') {
                chapters.push(pickFields(c, type))
              }
              if (c.children) flatten(c.children)
            })
          }
          flatten(bundle.chapters || [])
          list = chapters
        }
        resultData = list;
      }

      if (name === 'getEntitySchema') {
        const manual = generateAISchemaManual();
        // 如果提供了 type，尝试只返回该部分的 schema，否则返回全部
        resultData = manual || '未知类型或暂未定义 Schema';
      }

      if (name === 'getEntityDetail') {
        const { type, ids, range } = args
        if (!Array.isArray(ids)) throw new Error('ids must be an array');

        let details: any[] = []
        const isSelectAll = ids.includes('all');

        if (type === 'character') {
          const list = projectStore.bundle?.characters || []
          details = isSelectAll ? list : list.filter(c => ids.includes(c.id))
        } else if (type === 'outline') {
          const list = projectStore.bundle?.outline.structure.acts || []
          const content = projectStore.bundle?.outline.content || []
          
          let effectiveRange = range;
          if (!effectiveRange && ids.length === 1 && ids[0].startsWith('range:')) {
             const parts = ids[0].replace('range:', '').split('-');
             if (parts.length === 2) {
                effectiveRange = { start: parseInt(parts[0]), end: parseInt(parts[1]) };
             }
          }

          if (effectiveRange) {
             const start = Math.max(0, effectiveRange.start - 1)
             const end = Math.min(content.length, effectiveRange.end)
             details = [{
               id: ids[0] || 'selection',
               title: `大纲范围: ${effectiveRange.start}-${effectiveRange.end}`,
               content: content.slice(start, end).join('\n')
             }]
          } else {
             details = isSelectAll ? list : list.filter(a => ids.includes(a.id))
          }
        } else if (type === 'worldview') {
          const list = projectStore.bundle?.worldview.categories || []
          details = isSelectAll ? list : list.filter(c => ids.includes(c.type))
        } else if (type === 'timeline') {
          details = projectStore.bundle?.worldview.timeline || []
        } else if (type === 'chapters') {
          const allChapters: any[] = []
          const flatten = (items: any[]) => {
            items.forEach(c => {
               allChapters.push(c)
               if (c.children) flatten(c.children)
            })
          }
          flatten(projectStore.bundle?.chapters || [])
          details = isSelectAll ? allChapters : allChapters.filter(c => ids.includes(c.id))
        } else if (type === 'manuscript') {
          const bundle = projectStore.bundle
          const manuscript = bundle?.manuscript.content || []
          
          // 增强：从 ids 中解析 range:start-end 这种伪 ID (适配 AI 可能的直接引用)
          let effectiveRange = range;
          if (!effectiveRange && ids.length === 1 && ids[0].startsWith('range:')) {
             const parts = ids[0].replace('range:', '').split('-');
             if (parts.length === 2) {
                effectiveRange = { start: parseInt(parts[0]), end: parseInt(parts[1]) };
             }
          }

          if (effectiveRange) {
             // 优先处理显式的范围请求
             const start = Math.max(0, effectiveRange.start - 1)
             const end = Math.min(manuscript.length, effectiveRange.end)
             details = [{
               id: ids[0] || 'selection',
               title: `正文范围: ${effectiveRange.start}-${effectiveRange.end}`,
               content: manuscript.slice(start, end).join('\n')
             }]
          } else if (isSelectAll) {
            details = [{ id: 'all', title: '全集正文', content: manuscript.join('\n') }]
          } else {
            const allAnchorLines: number[] = [];
            const allNodes: any[] = [];
            const collect = (items: any[]) => {
              items.forEach(c => {
                allNodes.push(c)
                if (typeof c.anchorLineNumber === 'number') allAnchorLines.push(c.anchorLineNumber);
                if (c.children) collect(c.children);
              });
            };
            if (bundle) collect(bundle.chapters);
            allAnchorLines.sort((a, b) => a - b);

            details = ids.map(id => {
              const node = allNodes.find(n => n.id === id)
              if (node && typeof node.anchorLineNumber === 'number') {
                const startIdx = node.anchorLineNumber - 1;
                const nextAnchor = allAnchorLines.find(line => line > node.anchorLineNumber);
                const endIdx = nextAnchor ? nextAnchor - 1 : manuscript.length;
                return {
                  id: node.id,
                  title: node.title,
                  content: manuscript.slice(startIdx, endIdx).join('\n')
                }
              }
              return { id, error: 'Chapter not found or no content' }
            })
          }
        }

        // 重要：对返回给 AI 的详情数据也进行清洗，防止 AI 模仿内部的 base/projectId 结构
        const cleanedDetails = details.map(item => {
          let source = { ...item };
          if (source.base) {
            Object.assign(source, source.base);
            delete source.base;
          }

          const exportKeys = getAIExportKeys(type);
          const identityKeys = getIdentityKeys();
          const technicalKeys = getTechnicalKeys();

          const cleaned: any = {};
          for (const [key, value] of Object.entries(source)) {
            // 1. 如果在白名单中，或者是核心身份字段，则保留
            if (exportKeys.includes(key) || identityKeys.includes(key)) {
              // 2. 即使在白名单中，如果是技术字段且不在 identityKeys 中，也剔除
              if (technicalKeys.includes(key) && !identityKeys.includes(key)) continue;
              
              cleaned[key] = value;
            }
          }
          return cleaned;
        });

        resultData = cleanedDetails;
      }

      if (name === 'searchEntities') {
        const { query, type, fields } = args
        const results: any[] = []
        const q = (query || '').toLowerCase()
        
        const bundle = projectStore.bundle
        if (!bundle) throw new Error('No project bundle found');

        const pickFields = (item: any, itemType: string) => {
          let source = { ...item };
          if (source.base) {
            Object.assign(source, source.base);
            delete source.base;
          }
          const result: any = { id: source.id || source.type, type: itemType };
          const nameField = source.name ? 'name' : (source.title ? 'title' : (source.label ? 'label' : null));
          if (nameField) result[nameField] = source[nameField];

          if (Array.isArray(fields)) {
            fields.forEach(f => {
              if (source[f] !== undefined && f !== 'id' && f !== nameField) {
                result[f] = source[f];
              }
            });
          }
          return result;
        };

        if (!type || type === 'character') {
          bundle.characters.forEach(c => {
            if (c.base.name.toLowerCase().includes(q)) {
              results.push(pickFields(c, 'character'))
            }
          })
        }
        
        if (!type || type === 'outline') {
           bundle.outline.structure.acts.forEach(a => {
             if (a.title.toLowerCase().includes(q)) {
               results.push(pickFields(a, 'outline'))
             }
           })
        }

        if (!type || type === 'chapters' || type === 'manuscript') {
          const flatten = (items: any[]) => {
            items.forEach(c => {
              if (c.title.toLowerCase().includes(q)) {
                results.push(pickFields(c, type || 'chapters'))
              }
              if (c.children) flatten(c.children)
            })
          }
          flatten(bundle.chapters)
        }

        resultData = results.slice(0, 10);
      }

      if (name === 'getRelationGraph') {
        const nodes = characterStore.charactersInPhase.map(c => ({ id: c.id, label: c.name }))
        const edges = characterStore.relationshipsInPhase.map(r => ({ from: r.sourceId, to: r.targetId, label: r.label }))
        resultData = { nodes, edges };
      }

      if (resultData !== null) {
        let content = typeof resultData === 'string' ? resultData : JSON.stringify(resultData);

        // --- 结果保护：防止单一工具返回内容过多导致 Context 爆炸 ---
        if (content.length > MAX_TOOL_OUTPUT_LENGTH) {
          const originalLength = content.length;
          content = content.slice(0, MAX_TOOL_OUTPUT_LENGTH) + 
            `\n\n... (内容过长已截断，共 ${originalLength} 字符)\n` + 
            `[系统保护提示：当前工具返回数据量过大，已自动截断以保护对话上下文稳定性。如果需要获取完整内容，请 - 使用更精确的 ID - 指定行号范围(range: {start, end}) - 逐部分调取后续内容。]`;
          
          console.warn(`[AI Tool Engine] Result for ${name} truncated: ${originalLength} -> ${MAX_TOOL_OUTPUT_LENGTH}`);
        }

        const result = { toolCallId: call.id, content };
        console.log('Result:', resultData);
        console.groupEnd();
        return result;
      }

      // --- 写入型工具由 UI 处理 (AIAssistant.vue) ---
      console.log('Result: PENDING_USER_CONFIRM');
      console.groupEnd();
      return { toolCallId: call.id, content: 'TOOL_PENDING_USER_CONFIRM' }
    } catch (e: any) {
      console.error('Execution Error:', e);
      console.groupEnd();
      return { toolCallId: call.id, content: `Error: ${e.message}` }
    }
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
      
      // 1. 系统角色与工具使用规范
      const modeLabel = executionMode.value === 'agent' ? 'Agent (读写模式)' : 'Chat (只读模式)';
      const modeGuidance = executionMode.value === 'agent' 
        ? '你当前拥有实体的 Read & Write 权限，可以根据用户指令或创作需要，主动调用工具来同步更新项目数据。'
        : '你当前处于 [只读] 状态。你无法直接修改数据。如果用户指令隐含了“修改、创建或删除”的需求，你必须在回复中提醒用户点击左下角的模式切换按钮，将其改为 "Agent" 后再重试。';

      let systemPrompt = `
### 一、角色定位与工作目标

* 你是一个**写作辅助型 AI**，职责是协助用户完成构思、表达、结构优化与语言校正等写作相关工作。
* 你的输出应以**提升文本的清晰度、准确性、可读性和逻辑连贯性**为目标。
* 你不主动设定写作主题、立场或价值判断，除非用户明确要求。

---

### 二、基本工作原则

1. **以用户文本与指令为中心**

   * 严格围绕用户提供的内容与需求展开，不引入无关背景或扩展性假设。
   * 不替用户“补充立场”“拔高意义”或进行价值评判。

2. **最小必要干预原则**

   * 在润色、修改、改写时，只对必要部分进行调整。
   * 保留原有信息结构与表达意图，避免不必要的重写。

3. **逻辑优先于修辞**

   * 优先保证因果关系、条件关系、时间顺序和概念边界的清晰。
   * 当语言流畅性与逻辑严谨性冲突时，优先保证逻辑。

4. **显性结构，隐性评价**

   * 可以调整段落结构、句序和信息组织方式。
   * 避免对“写得好不好”“思路是否高级”等进行主观评价。

5. **一致性维护**

   * 术语、指代对象、时间口径、统计口径应保持一致。
   * 不随意替换已有概念名称，除非用户明确要求统一或规范。

---

### 三、语言风格约束

1. **表达风格**

   * 偏向书面、理性、中性表达。
   * 避免使用过多“黑话”、“行话”和“网络用语”，除非用户明确要求。
   * 避免情绪化、煽动性或过度修辞的语言。
   * 严格避免夹杂其他语言词汇或表达，除非用户明确要求。

2. **句式使用限制**

   * 避免频繁使用对立式句型（如“不是……而是……”）。
   * 避免使用高度概括性、抽象性但缺乏指向的判断句。
   * 减少空泛总结性语句，优先使用具体、可指代的表达。

3. **用词要求**

   * 用词应明确、可追溯，避免模糊指代（如“这种情况”“这些方面”），必要时直接指明对象。
   * 避免堆砌形容词与评价性副词。

4. **语气控制**

   * 不过度肯定用户观点，也不进行反驳式表达，除非用户明确要求评析或论证。
   * 不使用教学式、说教式语气。

---

### 四、输出行为约束

* 不主动添加总结段、升华段或价值判断段。
* 不擅自扩展篇幅，除非用户要求“扩写”“细化”。
* 不引入未被用户提及的理论框架、政策背景或案例。
* 当用户指令存在歧义时，优先采用**保守解释**，而非自行发挥。

---

### 五、默认交互策略

* 若用户提供文本：以**编辑、优化、结构调整**为优先。
* 若用户提供要求：严格按要求执行，不叠加额外目标。
* 若用户未说明风格：延续其已有文本风格与语域。

---

### 运行环境状态 ###
- **当前模式**：${modeLabel}
- **模式声明**：${modeGuidance}

### 核心操作原则 ###
1. **数据通信标准**：
   - **严格 JSON**：工具参数必须是合法对象，严禁将 array/object 序列化为转义字符串填充在字段中。
   - **扁平化输出**：严禁输出 \`base\` 嵌套层级，所有属性必须直铺在对象根路径；严禁输出 \`projectId\`、\`overrides\` 等研发侧技术字段。
2. **写入规范**：
   - 调用 \`upsertEntities\` 时，每个实体对象必须包含 \`type\`。
   - 更新已有项必须获取其真实有效的 \`id\`。

### 项目实体权限与 Schema 参考 ###
${generateAISchemaManual()}

### 工具调用决策指南 ###
- **通用意图**：默认进行自然对话。仅在确实需要依赖项目背景或用户明确要求操作数据时才使用 Function Calling。
- **只读查询**（全模式可用）：
  - 需要深挖背景：使用 \`getEntityDetail\`。
  - 查找关联项：使用 \`searchEntities\`。
  - 分析关系：使用 \`getRelationGraph\`。
- **数据写回**（仅限 Agent 模式）：
  - 发现新灵感或用户要求记录新设定：使用 \`upsertEntities\`。
  - 用户明确要求精细修改正文或大纲的特定文本片段：使用 \`editTextBlock\`。
- **越权提醒**：
  - 如果你在 [只读模式] 下识别到用户想要“保存某段话到设定”或“修改某人性格”，不要尝试调用写入工具，而应回复：“我当前的模式是只读的，请切换到 Agent 模式后，我将为您执行保存操作。”`

      messages.push({ role: 'system', content: systemPrompt })

      // 处理历史记录
      history.value.forEach((item, index) => {
        if (item.role === 'user') {
          // 如果是循环调用（工具返回后），由于 history 长度变了，这里 index 的判断需要谨慎
          // 我们取最后一个 user 角色之后且在当前助理消息之前的 fullPrompt
          const isLatestUser = index === history.value.findLastIndex(v => v.role === 'user');
          const content = isLatestUser ? fullPrompt : item.content;
          messages.push({ role: 'user', content });
        } else if (item.role === 'assistant') {
          if (item.id === assistantMsgId) return;
          // OpenAI 要求 tool_calls 必须配对
          messages.push({ 
            role: 'assistant', 
            content: item.content || null, 
            tool_calls: (item.toolCalls && item.toolCalls.length > 0) ? item.toolCalls : undefined 
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
      const readOnlyTools = ['getEntityList', 'getEntitySchema', 'getEntityDetail', 'searchEntities', 'getRelationGraph'];
      const availableTools = executionMode.value === 'chat' 
        ? AI_TOOLS.filter(t => readOnlyTools.includes(t.name))
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
            const errDetail = typeof result.error === 'object' ? (result.error.message || JSON.stringify(result.error)) : result.error;
            throw new Error(errDetail || '请求发送失败');
          }

          await promise;
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
            // 尝试通过正则或简单的字符串替换来修复常见的 AI 参数错误
            let rawArgs = tc.function.arguments || '{}';
            
            // 错误 1: ["item"] 被输出为 "['item']" (字符串包围的 Python 列表)
            if (/"ids":\s*"\[.*\]"/.test(rawArgs)) {
               rawArgs = rawArgs.replace(/"ids":\s*"(\[.*\])"/, (_, group) => {
                 const fixedArr = group.replace(/'/g, '"');
                 return ` "ids": ${fixedArr}`;
               });
            }

            // 错误 2: Unicode 转义序列在非必要情况下被双重转义或以原始形式保留
            if (rawArgs.includes('\\\\u')) {
              rawArgs = rawArgs.replace(/\\\\u([0-9a-fA-F]{4})/g, (_, grp) => {
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
      const assistantMsg = history.value.find(m => m.id === assistantMsgId)
      if (assistantMsg) {
        assistantMsg.content = `抱歉，请求模型时出错：${error.message || error}`
        assistantMsg.isError = true
        // 存储重试参数，即使是 Loop 模式，我们也存储最初触发该序列的参数
        assistantMsg.retryParams = { displayContent, fullPrompt, references }
      }
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
    const msg = history.value.find(m => m.id === msgId)
    if (!msg || !msg.retryParams) return

    const params = { ...msg.retryParams }
    
    // 发送一条简洁的“重试”指令，但携带完整的 fullPrompt 负载
    await sendMessage('重试', params.fullPrompt, params.references, false)
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
