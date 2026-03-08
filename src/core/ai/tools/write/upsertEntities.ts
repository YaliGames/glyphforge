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
              enum: ['character', 'worldview', 'relationship', 'outline', 'timeline'],
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

    const created: any[] = [];
    const updated: any[] = [];
    const skipped: any[] = [];
    
    for (const rawEntity of entities) {
      let type = rawEntity.type;
      const id = rawEntity.id;
      
      const schema = SCHEMA_REGISTRY[type];
      if (!schema) {
        skipped.push({ type, reason: `Unknown entity type: ${type}` });
        continue;
      }

      const sanitizedData: any = {};
      schema.fields.forEach(field => {
        if (field.aiImport && rawEntity[field.key] !== undefined) {
          sanitizedData[field.key] = rawEntity[field.key];
        }
      });

      if (type === 'character') {
        if (id) {
          characterStore.smartUpdateCharacter(id, sanitizedData);
          updated.push({ type, id, name: sanitizedData.name });
        } else {
          const newChar = characterStore.addCharacter(sanitizedData.name || '新角色');
          if (newChar) {
            characterStore.smartUpdateCharacter(newChar.id, sanitizedData);
            created.push({ type, id: newChar.id, name: sanitizedData.name });
          }
        }
      } else if (type === 'relationship') {
        if (id) {
          characterStore.smartUpdateRelationship(id, sanitizedData);
          updated.push({ type, id, label: sanitizedData.label });
        } else if (sanitizedData.sourceId && sanitizedData.targetId) {
          const newRel = characterStore.addRelationship(sanitizedData.sourceId, sanitizedData.targetId, sanitizedData.type || 'custom');
          if (newRel) {
            characterStore.smartUpdateRelationship(newRel.id, sanitizedData);
            created.push({ type, id: newRel.id, label: sanitizedData.label });
          }
        }
      } else if (type === 'outline') {
        if (id) {
          outlineStore.updateActMetadata(id, sanitizedData);
          updated.push({ type, id, title: sanitizedData.title });
        } else {
          const newAct = outlineStore.createAct(sanitizedData.title || '新幕', sanitizedData.range);
          if (newAct) {
            outlineStore.updateActMetadata(newAct.id, sanitizedData);
            created.push({ type, id: newAct.id, title: sanitizedData.title });
          }
        }
      } else if (type === 'worldview') {
        const categoryId = id || sanitizedData.id;
        
        if (!categoryId || categoryId === 'worldview') {
          skipped.push({ type, reason: `Missing or invalid worldview category ID` });
          continue;
        }

        const displayName = WORLDVIEW_TYPE_MAP[categoryId] || sanitizedData.name || categoryId;
        const category = worldviewStore.worldview?.categories.find((c: any) => c.type === categoryId);
        
        sanitizedData.name = displayName;

        if (category) {
          worldviewStore.updateCategory(categoryId, sanitizedData);
          updated.push({ type, id: categoryId, name: displayName });
        } else {
          worldviewStore.addCategory(displayName, categoryId);
          worldviewStore.updateCategory(categoryId, sanitizedData);
          created.push({ type, id: categoryId, name: displayName });
        }
      } else if (type === 'timeline') {
        const eventData = {
          title: sanitizedData.title || '',
          description: sanitizedData.content || '',
          participants: sanitizedData.participants || [],
          time: {
            label: sanitizedData.date || '',
            order: 0 
          }
        };

        if (id) {
          worldviewStore.updateTimelineEvent(id, eventData);
          updated.push({ type, id, title: sanitizedData.title });
        } else {
          const newEvent = worldviewStore.addTimelineEvent(sanitizedData.title || '新事件');
          if (newEvent) {
            worldviewStore.updateTimelineEvent(newEvent.id, eventData);
            created.push({ type, id: newEvent.id, title: sanitizedData.title });
          }
        }
      }
    }

    const summary: string[] = [];
    if (created.length > 0) summary.push(`新建: ${created.map(e => `${e.name || e.title || e.id} (${e.id})`).join(', ')}`);
    if (updated.length > 0) summary.push(`更新: ${updated.map(e => `${e.name || e.title || e.id} (${e.id})`).join(', ')}`);
    if (skipped.length > 0) summary.push(`跳过: ${skipped.length} 项`);

    return {
      status: 'success',
      data: {
        created,
        updated
      },
      message: `操作成功：\n- ${summary.join('\n- ')}`
    };
  }
};
