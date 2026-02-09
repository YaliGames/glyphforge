import { DecoupledTool, ToolContext } from '../index';

export const deleteEntitiesTool: DecoupledTool = {
  name: 'deleteEntities',
  description: '从项目中彻底移除指定的物理实体及其关联数据。支持跨类型批量操作。',
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
              description: '待删除的实体分类。'
            },
            id: { type: 'string', description: '目标实体的物理 ID（UUID）。' },
            categoryType: { type: 'string', description: '仅限世界观类型：分类 ID（如 geography）。' }
          },
          required: ['type', 'id']
        },
        description: '待移除的目标列表。'
      }
    },
    required: ['entities']
  },
  async execute(args: any, context: ToolContext) {
    const { entities } = args;
    const { characterStore, outlineStore, worldviewStore } = context;
    if (!Array.isArray(entities)) throw new Error('Entities must be an array');

    entities.forEach((e: any) => {
      if (e.type === 'character') characterStore.removeCharacter(e.id);
      else if (e.type === 'outline') outlineStore.removeAct(e.id);
      else if (e.type === 'relationship') characterStore.removeRelationship(e.id);
      else if (e.type === 'timeline') worldviewStore.removeTimelineEvent(e.id);
    });

    return `成功删除了 ${entities.length} 个实体`;
  }
};
