import persona from './persona.md?raw'
import research from './research.md?raw'
import domain from './domain.md?raw'
import { generateAISchemaManual } from '../schemaRegistry'
import type { AIExecutionMode } from '@/types'

/**
 * 提示词组装引擎
 * 统一管理系统提示词的构建、动态注入与环境标记
 */
export const PromptAssembler = {
  /**
   * 生成完整的 System Prompt
   */
  assembleSystemPrompt(mode: AIExecutionMode): string {
    const modeLabel = mode === 'agent' ? 'Agent (读写模式)' : 'Chat (只读模式)'
    const modeGuidance = mode === 'agent' 
      ? '你当前拥有实体的 Read & Write 权限，可以根据用户指令或创作需要，主动调用工具来同步更新项目数据。'
      : '你当前处于 [只读] 状态。你无法直接修改数据。如果用户指令隐含了“修改、创建或删除”的需求，你必须在回复中提醒用户点击左下角的模式切换按钮，将其改为 "Agent" 后再重试。'

    const sections = [
      persona,
      research,
      `---
### 运行环境状态 ###
- **当前模式**：${modeLabel}
- **模式声明**：${modeGuidance}`,
      domain,
      generateAISchemaManual(),
      this.getToolGuidance()
    ]

    return sections.join('\n\n')
  },

  /**
   * 获取工具调用决策指南
   * TODO: Agent / Chat 模式可用工具动态渲染
   */
  getToolGuidance(): string {
    return `### 工具调用指南 ###
- **严格遵循 Schema**：调用参数必须是一个合法的单层 JSON 对象。
- **通用意图**：默认进行自然对话。仅在确实需要依赖项目背景或用户明确要求操作数据时才使用 Function Calling。
- **只读查询**（全模式可用）：
  - 需要深挖背景：使用 \`getEntityDetail\`。
  - 查找关联项：使用 \`searchEntities\`。
  - 分析关系：使用 \`getRelationGraph\`。
- **数据写回**（仅限 Agent 模式）：
  - 发现新灵感或用户要求记录新设定：使用 \`upsertEntities\`。
  - 用户明确要求精细修改正文或大纲的特定文本片段：使用 \`editTextBlock\`。`
  },

  /**
   * 生成消息前置锚点 (Mode Anchor)
   * 注入到用户消息开头，确保 AI 立即感知模式切换
   */
  getModeAnchor(mode: AIExecutionMode): string {
    return mode === 'agent' 
      ? `[系统指令：当前处于 Agent (读写) 模式。拥有实体数据的修改与创建权限，请根据需要主动调用 upsertEntities 等写入类工具。]\n\n`
      : `[系统指令：当前处于 Chat (只读) 模式。只能进行查询，无法修改任何数据。如果用户指令隐含了“修改、创建或删除”的需求，需要在回复中提醒用户切换为 "Agent" 后再重试。]\n\n`
  }
}
