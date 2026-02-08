/**
 * AI 辅助系统接口与参考树定义
 */

export interface AIPrompt {
  id: string
  label: string
  description: string // 简短描述，用于列表展示
  content: string // 模板字符串，包含 [REFERENCES] 和 [USER_INPUT]
  category: 'outline' | 'writing' | 'character' | 'world' | 'general'
}

export type AIExecutionMode = 'chat' | 'agent'

export interface AIReference {
  type: string
  id: string | 'all'
  label: string
  range?: { start: number; end: number }
}

export interface AIHistoryItem {
  id: string
  role: 'user' | 'assistant' | 'tool' | 'system'
  content: string
  type: 'text' | 'json' | 'tool_call' | 'error'
  isError?: boolean // 标记该消息是否为错误信息
  retryParams?: { // 用于失败后的重试逻辑
    displayContent: string
    fullPrompt: string
    references?: Record<string, any>
  }
  references?: Record<string, any> // 对话时引用的具体原始数据副本
  selectedReferences?: AIReference[] // 用户显式通过 @ 选中的引用
  toolCalls?: AIToolCall[] // assistant 发出的工具调用指令
  toolCallId?: string      // role='tool' 时关联的调用 ID
  toolResults?: AIToolResult[] // 批量操作时的工具执行结果
  timestamp: number
}

/**
 * AI 工具 (Function Calling) 定义
 */
export interface AITool {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

/**
 * 工具调用指令内容
 */
export interface AIToolCall {
  id: string
  type: 'function'
  index?: number // 用于流式处理中的 chunk 合并
  function: {
    name: string
    arguments: string // JSON 字符串
  }
  status?: 'pending' | 'applied' | 'rejected' // 本地 UI 状态
}

/**
 * 工具执行结果
 */
export interface AIToolResult {
  toolCallId: string
  content: string // 通常是 JSON 字符串，表示成功或错误信息
}

/**
 * AI 参考内容节点定义 (统一递归结构)
 */
export interface ReferenceNode {
  value: string;       // 对应 project.json 中的字段名
  label: string;       // 用户友好的显示名称
  description: string; // 字段的详细解释
  path?: string;       // 数据提取路径 (全路径)
  isGranular?: boolean; // 是否支持精细化选择 (如下属的 Array 项)
  children?: ReferenceNode[];
}

/**
 * 项目参考体系配置 (严格遵循 GlyphForgeBundle 物理层级)
 */
export const PROJECT_REFERENCE_TREE: ReferenceNode[] = [
  {
    value: 'project',
    label: '项目元数据',
    description: '项目的全局身份与元信息配置。',
    path: 'project',
    children: [
      { value: 'id', label: '项目 ID', description: '项目的唯一唯一标识符 (UUID)' },
      { value: 'title', label: '书名', description: '小说的名称/书名' },
      { value: 'description', label: '梗概', description: '作品的核心摘要或梗概' },
      { value: 'createdAt', label: '创建时间', description: '项目创建的时间戳' },
      { value: 'updatedAt', label: '更新时间', description: '项目最后一次更新的时间戳' },
      { value: 'hierarchies', label: '层级定义', description: '层级定义配置，决定了卷、章、节的深度与称谓' }
    ]
  },
  {
    value: 'chapters',
    label: '目录结构',
    description: '小说的层级目录树（卷、章、节节点列表）。',
    path: 'chapters',
    isGranular: true
  },
  {
    value: 'manuscript',
    label: '写作正文',
    description: '作品的实时文本手稿内容。引用特定章节会导出其对应的正文文本。',
    path: 'manuscript',
    isGranular: true
  },
  {
    value: 'worldview',
    label: '设定分类',
    description: '具体的规则模块（如地理、科技、种族、势力、魔法体系等）。',
    path: 'worldview.categories',
    isGranular: true,
    children: [
      { value: 'type', label: '分类标识', description: '分类的技术名称/标识符' },
      { value: 'name', label: '分类名', description: '分类的展示名称' },
      { value: 'summary', label: '简介', description: '该设定的简要介绍' },
      { value: 'details', label: '细则列表', description: '详细的设定条目列表，记录核心规则' }
    ]
  },
  {
    value: 'timeline',
    label: '历史年表',
    description: '作品世界观的大事件轴线。',
    path: 'worldview.timeline',
    isGranular: true,
    children: [
      { value: 'time', label: '发生时间', description: '事件发生的时间点信息 (包含展示标签和排序 order)' },
      { value: 'title', label: '事件主题', description: '事件的主题名称' },
      { value: 'description', label: '事件详情', description: '事件发生的具体起因、经过 and 结果' },
      { value: 'participants', label: '参与者', description: '参与该历史事件的实体 ID 列表' },
      { value: 'impact', label: '影响范围', description: '受该事件影响的世界观分类类型' }
    ]
  },
  {
    value: 'outline',
    label: '叙事大纲',
    description: '作品的结构化创作规划指南。',
    path: 'outline',
    isGranular: true,
    children: [
      { value: 'content', label: '大纲草稿', description: '原始的分行大纲文本内容', path: 'outline.content' },
      {
        value: 'narrative',
        label: '叙事说明',
        description: '关于叙事调性或计划的全局笔记。',
        path: 'outline.narrative',
        children: [
          { value: 'notes', label: '叙事笔记', description: '具体的笔记正文内容' }
        ]
      },
      {
        value: 'acts',
        label: '分幕列表',
        description: '分幕式剧情规划数组。',
        path: 'outline.structure.acts',
        isGranular: true,
        children: [
          { value: 'id', label: '幕 ID', description: '唯一标识' },
          { value: 'title', label: '核心标题', description: '本幕的核心剧情主题' },
          { value: 'purpose', label: '写作意图', description: '作者设立此幕的创作目的' },
          { value: 'range', label: '正文范围', description: '对应的起始与偏移行号' },
          { value: 'linkedChapters', label: '关联章节', description: '逻辑上归属于此幕的章节 ID 列表' }
        ]
      }
    ]
  },
  {
    value: 'character',
    label: '人物档案',
    description: '全量角色的多维度设定体系。',
    path: 'characters',
    isGranular: true,
    children: [
      { value: 'id', label: '唯一标识', description: '角色的内部 ID' },
      { value: 'base', label: '基础设定', description: '包含姓名、别名、阵营、身份、外貌、性格、背景' },
      { value: 'phases', label: '演变阶段', description: '随剧情推进变化的角色状态覆盖' },
      { value: 'relations', label: '人际关系', description: '角色的社会关系网定义' },
      { value: 'notes', label: '创作备忘', description: '作者关于该角色的私密笔记(authorNotes)和未答质疑' }
    ]
  },
  {
    value: 'chapters',
    label: '目录结构',
    description: '作品的逻辑章节树及物理映射。',
    path: 'chapters',
    isGranular: true,
    children: [
      { value: 'id', label: '目录 ID', description: '唯一标识' },
      { value: 'depth', label: '层级深度', description: '0 为顶级' },
      { value: 'type', label: '层级语义', description: '卷,章,节,场' },
      { value: 'anchorLineNumber', label: '起始行号', description: '正文物理起始行号' },
      { value: 'title', label: '章节标题', description: '该层级的标题文本' },
      { value: 'tags', label: '属性标签', description: '用于自动匹配等逻辑的标签' },
      { value: 'children', label: '子章节', description: '嵌套的层级数组' }
    ]
  },
  {
    value: 'authorNotes',
    label: '全书笔记',
    description: '属于作品全局或特定实例的灵感笔记。',
    path: 'authorNotes',
    children: [
      { value: 'content', label: '笔记内容', description: '具体的笔记文本' },
      { value: 'scope', label: '作用域', description: '全局、大纲、角色或特定章节' },
      { value: 'targetId', label: '关联目标', description: '具体关联的数据对象 ID' }
    ]
  }
];
