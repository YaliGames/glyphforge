import { DecoupledTool, ToolContext } from '../index';
import { SCHEMA_REGISTRY } from '../../schema-registry';

export const upsertEntitiesTool: DecoupledTool = {
  name: 'upsertEntities',
  description: '创建或增量更新结构化实体（角色、世界观、关系、大纲）。',
  isReadOnly: false,
  parameters: {
    type: 'object',
    properties: {
      entities: {
        type: 'array',
        items: { 
          type: 'object', 
          properties: {
            type: { type: 'string', enum: ['character', 'worldview', 'relationship', 'outline'] },
            id: { type: 'string' }
          },
          required: ['type'],
          additionalProperties: true
        }
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
          const newAct = outlineStore.createAct(sanitizedData.title || '新幕');
          if (newAct) {
            outlineStore.updateActMetadata(newAct.id, sanitizedData);
            results.push(`创建大纲: ${sanitizedData.title}`);
          }
        }
      } else if (type === 'worldview') {
        const categoryId = id || sanitizedData.type;
        if (categoryId) {
          worldviewStore.updateCategory(categoryId, sanitizedData);
          results.push(`同步世界观: ${categoryId}`);
        }
      }
    }

    return results.length > 0 ? `操作成功：\n- ${results.join('\n- ')}` : '未发现可处理的实体数据';
  }
};
