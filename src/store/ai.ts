import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import type { AIPrompt, AIHistoryItem } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { useProjectStore } from './project'
import { useSettingsStore } from './settings'

const STORAGE_KEY = 'glyphforge-custom-prompts'

const BUILTIN_PROMPTS: AIPrompt[] = [
  {
    id: 'builtin-expand',
    label: '文笔润色与扩写',
    description: '深度扩写片段，并提供文学性的修辞建议与逻辑分析',
    category: 'writing',
    content: `你是一位擅长氛围描写的文学导师。请基于下方提供的上下文（JSON格式）和我的指令，对目标片段进行扩写。

必须仅返回 JSON 对象，格式如下：
{
  "creative": {
    "type": "manuscript",
    "text": "扩写后的正文内容（保持风格一致）"
  },
  "analytical": {
    "rationale": "解释修辞的选择，以及如何对齐世界观基调",
    "suggestions": ["情节后续发展的可能性", "可以进一步深挖的意象"]
  }
}

[ 项目上下文 ]
[JSON]

[ 创作指令 ]
[USER_INPUT]`
  },
  {
    id: 'builtin-character-design',
    label: '角色深度构建',
    description: '补全角色档案，并分析其性格冲突与动机',
    category: 'character',
    content: `你正在协助我设计角色细节。请基于世界观背景（JSON格式），补全正在设计的角色属性。

必须仅返回 JSON 对象，格式如下：
{
  "creative": {
    "type": "character",
    "data": {
      "base": { "appearance": "外貌描述", "personality": "性格深度", "background": "关联设定" }
    }
  },
  "analytical": {
    "rationale": "分析该角色在当前世界观下的生存逻辑",
    "suggestions": ["该角色的潜在成长弧线", "可能与其产生冲突的其他角色类型"]
  }
}

[ 世界观上下文 ]
[JSON]

[ 基础设计信息 ]
[USER_INPUT]`
  },
  {
    id: 'builtin-worldview-design',
    label: '设定系统推演',
    description: '深化世界观条目，并推演可能产生的矛盾点',
    category: 'world',
    content: `你正在协助我进行世界观深度推演。请基于已有的设定，拓展我指定的维度。

必须仅返回 JSON 对象，格式如下：
{
  "creative": {
    "type": "worldview",
    "data": { "name": "条目名称", "content": "详细的条目叙述，包含历史、逻辑等" }
  },
  "analytical": {
    "rationale": "分析此设定如何填补现有逻辑链条",
    "suggestions": ["此设定可能引发的社会冲突", "在实际剧情中可以展现该设定的场景建议"]
  }
}

[ 现有设定基础 ]
[JSON]

[ 拓展目标与初步想法 ]
[USER_INPUT]`
  },
  {
    id: 'builtin-check',
    label: '设定一致性检查',
    description: '识别情节是否与已定义的世界观百科或人物档案存在冲突',
    category: 'general',
    content: `请扮演严谨的文学编辑。我将为你提供项目的百科数据（JSON格式）以及我正在创作的情节段落。

必须仅返回 JSON 对象，格式如下：
{
  "creative": {
    "type": "analysis",
    "summary": "一致性检查报告摘要"
  },
  "analytical": {
    "rationale": "基于逻辑和背景设定对该段落进行的深度审查分析",
    "suggestions": ["逻辑漏洞修正建议 1", "建议 2"],
    "warnings": ["具体的设定冲突点 1", "冲突点 2"]
  }
}

[ 项目百科数据 ]
[JSON]

[ 待审阅的情节或关注点 ]
[USER_INPUT]`
  },
  {
    id: 'builtin-transition',
    label: '章节衔接分析',
    description: '分析两个章节之间的叙事节奏与逻辑过渡',
    category: 'outline',
    content: `请作为叙事结构专家，审阅章节间的衔接。

必须仅返回 JSON 对象，格式如下：
{
  "creative": {
    "type": "outline",
    "text": "建议的过渡桥段或润色建议"
  },
  "analytical": {
    "rationale": "分析当前衔接的情感曲率与节奏断层情况",
    "suggestions": ["如何加强前后的悬念挂钩", "转场技巧建议"]
  }
}

[ 章节大纲与叙事状态 ]
[JSON]

[ 具体的衔接困惑 ]
[USER_INPUT]`
  }
]

export const useAIStore = defineStore('ai', () => {
  const isVisible = ref(false)
  const isProcessing = ref(false)
  const history = ref<AIHistoryItem[]>([])
  const referenceKeys = ref<string[]>([])
  const selectedPromptId = ref<string>('')
  const granularSelections = ref<Record<string, string[]>>({})
  const pendingInput = ref<string>('')

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

  function addHistory(role: 'user' | 'assistant', content: string, type: 'text' | 'json' = 'text', references?: Record<string, any>) {
    history.value.push({
      id: uuidv4(),
      role,
      content,
      type,
      references,
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
    // 对话历史中仅保存用户可见的简洁内容
    addHistory('user', displayContent, 'text', references)

    try {
      let body: any
      let headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (activeProfile.apiKey) {
        headers['Authorization'] = `Bearer ${activeProfile.apiKey}`
      }

      if (activeProfile.provider === 'openai') {
        body = {
          model: activeProfile.model,
          messages: [
            { role: 'system', content: '你是一位专业的写作助手，请根据上下文内容和指令为用户提供高质量的创作支持。' },
            { role: 'user', content: fullPrompt }
          ]
        }
      } else if (activeProfile.provider === 'anthropic') {
        // Claude 格式略有不同
        headers['x-api-key'] = activeProfile.apiKey
        headers['anthropic-version'] = '2023-06-01'
        delete headers['Authorization']
        body = {
          model: activeProfile.model,
          max_tokens: 4096,
          messages: [
            { role: 'user', content: fullPrompt }
          ]
        }
      } else if (activeProfile.provider === 'custom') {
        // 自定义引擎：使用模板
        if (!activeProfile.template) {
          throw new Error('自定义提供商必须配置请求模板')
        }
        
        const messages = [
          { role: 'system', content: '你是一位专业的写作助手' },
          { role: 'user', content: fullPrompt }
        ]

        const payloadStr = activeProfile.template
          .replace(/\$\{model\}/g, activeProfile.model)
          .replace(/\$\{messages\}/g, JSON.stringify(messages))
          .replace(/\$\{prompt\}/g, JSON.stringify(fullPrompt))

        body = JSON.parse(payloadStr)
      }

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
      let content = ''

      // 提取回复内容
      if (activeProfile.provider === 'openai') {
        content = data.choices?.[0]?.message?.content || ''
      } else if (activeProfile.provider === 'anthropic') {
        content = data.content?.[0]?.text || ''
      } else if (activeProfile.provider === 'custom') {
        // 根据 responsePath 提取
        const path = activeProfile.responsePath || 'choices[0].message.content'
        content = getValueByPath(data, path)
      }

      if (!content) {
        console.warn('Extracted empty content from:', data)
        throw new Error('未能从模型响应中提取到内容')
      }

      addHistory('assistant', content, content.trim().startsWith('{') && content.trim().endsWith('}') ? 'json' : 'text')
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
    sendMessage
  }
})
