import { AITool } from '@/types/ai';
import { generateAISchemaManual } from './schema-registry';

/**
 * 助手方法：生成实体字段的 AI 描述信息
 */
function getEntityFieldsDescription(): string {
  return generateAISchemaManual();
}

/**
 * 预定义 AI 工具集 (Function Calling)
 */
export const AI_TOOLS: AITool[] = [
  {
    name: 'getEntityList',
    description: '获取某一实体类型下的实体列表概要信息，用于了解项目中“有哪些对象可被引用”。',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['character', 'worldview', 'relationship', 'timeline', 'chapters', 'manuscript'], description: '实体类型' },
        fields: { type: 'array', items: { type: 'string' }, description: '需要返回的额外字段列表，默认仅返回 name。' }
      },
      required: ['type']
    }
  },
  {
    name: 'getEntitySchema',
    description: '获取指定实体类型的字段定义信息（Schema），用于了解该类实体包含哪些可用字段。',
    parameters: {
      type: 'object',
      properties: {
        type: { 
          type: 'string', 
          enum: ['character', 'worldview', 'relationship', 'outline', 'chapters', 'manuscript'], 
          description: '实体类型' 
        }
      },
      required: ['type']
    }
  },
  {
    name: 'getEntityDetail',
    description: '获取单个或多个实体的详细完整信息。对于 manuscript 或 outline，支持通过 range 参数获取特定行号范围的正文，这比全量获取更高效。',
    parameters: {
      type: 'object',
      properties: {
        type: { 
          type: 'string', 
          enum: ['character', 'worldview', 'relationship', 'outline', 'chapters', 'manuscript'], 
          description: '实体类型' 
        },
        ids: { type: 'array', items: { type: 'string' }, description: '实体 ID 列表。支持 ["all"]。' },
        range: { 
          type: 'object', 
          properties: {
            start: { type: 'number', description: '起始物理行号 (1-indexed)' },
            end: { type: 'number', description: '结束物理行号 (1-indexed)' }
          },
          description: '可选：指定行号范围获取内容。仅对 manuscript 和 outline 有效。如果提供 ids 为 ["range:1-10"] 这种形式，逻辑也会尝试解析。'
        }
      },
      required: ['type', 'ids']
    }
  },
  {
    name: 'searchEntities',
    description: '基于关键词在实体集合中进行搜索，辅助发现相关的历史背景或人物设定。',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['character', 'worldview', 'relationship', 'timeline', 'chapters', 'manuscript'], description: '实体类型' },
        query: { type: 'string', description: '搜索关键词' },
        fields: { type: 'array', items: { type: 'string' }, description: '参与匹配并返回的字段列表。' }
      },
      required: ['type', 'query']
    }
  },
  {
    name: 'getRelationGraph',
    description: '专门针对人物关系（character relationship）获取指定实体的关系网络。',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '角色 ID' },
        depth: { type: 'number', description: '关系展开层级，默认 1。' }
      },
      required: ['id']
    }
  },
  {
    name: 'editTextBlock',
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
    name: 'upsertEntities',
    description: `创建或增量更新结构化实体（角色、世界观、关系、大纲）。
重要规范：
1. 必须严格遵守字段白名单，禁止添加不存在的属性。
2. 更新已有项必须携带 id，且该 id 必须是之前提供的数据快照中的真实值。
3. 严禁嵌套 "properties"、"base" 等非白名单 key。

${getEntityFieldsDescription()}`,
    parameters: {
      type: 'object',
      properties: {
        entities: {
          type: 'array',
          items: { 
            type: 'object', 
            properties: {
              type: { 
                type: 'string', 
                enum: ['character', 'worldview', 'relationship', 'outline'],
                description: '实体分类类型。' 
              },
              id: { type: 'string', description: '修改已有项时必填的 ID。新增项不要填写此字段。' }
            },
            required: ['type'],
            additionalProperties: true
          },
          description: '要操作的实体对象数组。'
        }
      },
      required: ['entities']
    }
  },
  {
    name: 'deleteEntities',
    description: '批量删除指定的工程实体（角色、世界观条目等）。',
    parameters: {
      type: 'object',
      properties: {
        entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { 
                type: 'string', 
                enum: ['character', 'worldview', 'relationship', 'outline'],
                description: '实体类型'
              },
              id: { type: 'string', description: '唯一标识符 (ID)' },
              categoryType: { type: 'string', description: '仅限世界观类型，提供类别 ID (如 geography)' }
            },
            required: ['type', 'id']
          },
          description: '需要删除的实体列表。'
        }
      },
      required: ['entities']
    }
  }
];
