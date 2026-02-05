import { AITool } from '@/types/ai';

/**
 * 预定义 AI 工具集 (Function Calling)
 */
export const AI_TOOLS: AITool[] = [
  {
    name: 'edit_text_block',
    description: '精准修改或替换正文/大纲中的文本段落。仅在用户要求修改已存在的章节内容、大纲描述时使用。禁止用于日常对话。',
    parameters: {
      type: 'object',
      properties: {
        search_text: { type: 'string', description: '需要被替换的原始文本。必须是数据快照中真实存在的字符串。' },
        replace_text: { type: 'string', description: '替换后的新文本内容。' },
        context_hint: { type: 'string', description: '修改意图说明。' }
      },
      required: ['search_text', 'replace_text']
    }
  },
  {
    name: 'upsert_entities',
    description: '创建或修改结构化实体（角色、世界观条目、关系、时间线等）。如果实体包含 ID 则为修改，不包含则为新建。',
    parameters: {
      type: 'object',
      properties: {
        type: { 
          type: 'string', 
          enum: ['character', 'worldview', 'relationship', 'timeline'],
          description: '实体的分类类型。' 
        },
        entities: {
          type: 'array',
          items: { 
            type: 'object', 
            properties: {
              id: { type: 'string', description: '修改时必填的 UUID。新增时留空。' },
              name: { type: 'string', description: '实体名称' }
            },
            required: ['name'],
            additionalProperties: true
          },
          description: '必须提供一个真正的 JSON 对象数组。禁止使用字符串包裹。'
        }
      },
      required: ['type', 'entities']
    }
  },
  {
    name: 'delete_entities',
    description: '批量删除指定的工程实体（角色、世界观条目等）。',
    parameters: {
      type: 'object',
      properties: {
        type: { 
          type: 'string', 
          enum: ['character', 'worldview', 'relationship', 'timeline'],
          description: '实体类型'
        },
        ids: {
          type: 'array',
          items: { type: 'string', description: '唯一标识符 (UUID)' },
          description: '需要删除的实体 ID 列表。'
        }
      },
      required: ['type', 'ids']
    }
  }
];
