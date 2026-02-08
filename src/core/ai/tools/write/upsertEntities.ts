import { DecoupledTool, ToolContext } from '../index';
import { SCHEMA_REGISTRY, generateAISchemaManual } from '../../schemaRegistry';
import { WORLDVIEW_PRESET_CATEGORIES } from '@/config';

const WORLDVIEW_TYPE_MAP: Record<string, string> = Object.fromEntries(
  WORLDVIEW_PRESET_CATEGORIES.map(c => [c.type, c.name])
);

export const upsertEntitiesTool: DecoupledTool = {
  name: 'upsertEntities',
  get description() {
    return `批量创建或更新结构化设定。规范：1. 更新操作必须提供有效的 ID，新建操作严禁包含 ID；2. 禁止输出 Schema 定义外的无效属性；3. 必须保持数据结构扁平化，严禁深层嵌套。\n${generateAISchemaManual()}`;
  },
  isReadOnly: false,
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
              description: '待操作的实体分类。' 
            },
            id: { type: 'string', description: '变更已有实体时必填的物理 ID。新建项严禁包含此字段。' }
          },
          required: ['type'],
          additionalProperties: true
        },
        description: '实体数据对象序列。'
      }
    },
    required: ['entities']
  },

  async execute(args: any, context: ToolContext) {
    const { entities } = args;
    const { characterStore, outlineStore, worldviewStore } = context;
    if (!Array.isArray(entities)) throw new Error('Entities must be an array');

    const results: string[] = [];
    
    for (const rawEntity of entities) {
      let type = rawEntity.type;
      const id = rawEntity.id;
      
      const schema = SCHEMA_REGISTRY[type];
      if (!schema) continue;

      const sanitizedData: any = {};
      schema.fields.forEach(field => {
        if (field.aiImport && rawEntity[field.key] !== undefined) {
          sanitizedData[field.key] = rawEntity[field.key];
        }
      });

      if (type === 'character') {
        if (id) {
          characterStore.smartUpdateCharacter(id, sanitizedData);
          results.push(`更新角色: ${id}`);
        } else {
          const newChar = characterStore.addCharacter(sanitizedData.name || '新角色');
          if (newChar) {
            characterStore.smartUpdateCharacter(newChar.id, sanitizedData);
            results.push(`创建角色: ${sanitizedData.name}`);
          }
        }
      } else if (type === 'relationship') {
        if (id) {
          characterStore.smartUpdateRelationship(id, sanitizedData);
          results.push(`更新关系: ${id}`);
        } else if (sanitizedData.sourceId && sanitizedData.targetId) {
          const newRel = characterStore.addRelationship(sanitizedData.sourceId, sanitizedData.targetId, sanitizedData.type || 'custom');
          if (newRel) {
            characterStore.smartUpdateRelationship(newRel.id, sanitizedData);
            results.push(`创建关系: ${newRel.id}`);
          }
        }
      } else if (type === 'outline') {
        if (id) {
          outlineStore.updateActMetadata(id, sanitizedData);
          results.push(`更新大纲: ${id}`);
        } else {
          const newAct = outlineStore.createAct(sanitizedData.title || '新幕', sanitizedData.range);
          if (newAct) {
            outlineStore.updateActMetadata(newAct.id, sanitizedData);
            results.push(`创建大纲: ${sanitizedData.title}`);
          }
        }
      } else if (type === 'worldview') {
        const categoryId = id || sanitizedData.id;
        
        // 防止因 AI 漏传 ID 导致误拿顶级 "type: worldview" 作为标识符
        if (!categoryId || categoryId === 'worldview') {
          results.push(`跳过世界观: 未提供有效的类别 ID (如 geography)`);
          continue;
        }

        const displayName = WORLDVIEW_TYPE_MAP[categoryId] || sanitizedData.name || categoryId;
        const category = worldviewStore.worldview?.categories.find((c: any) => c.type === categoryId);
        
        // 强制修正名称并同步到 SanitizedData
        sanitizedData.name = displayName;

        if (category) {
          worldviewStore.updateCategory(categoryId, sanitizedData);
          results.push(`更新世界观分类: ${displayName}`);
        } else {
          // 如果分类不存在，则创建它
          worldviewStore.addCategory(displayName, categoryId);
          worldviewStore.updateCategory(categoryId, sanitizedData);
          results.push(`新建世界观分类: ${displayName}`);
        }
      }
    }

    return results.length > 0 ? `操作成功：\n- ${results.join('\n- ')}` : '未发现可处理的实体数据';
  }
};
