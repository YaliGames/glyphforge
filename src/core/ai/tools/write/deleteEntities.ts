import { DecoupledTool, ToolContext } from '../index';

export const deleteEntitiesTool: DecoupledTool = {
  name: 'deleteEntities',
  description: '批量删除指定的工程实体。',
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
          required: ['type', 'id']
        }
      }
    },
    required: ['entities']
  },
  async execute(args: any, context: ToolContext) {
    const { entities } = args;
    const { characterStore, outlineStore } = context;
    if (!Array.isArray(entities)) throw new Error('Entities must be an array');

    entities.forEach((e: any) => {
      if (e.type === 'character') characterStore.removeCharacter(e.id);
      else if (e.type === 'outline') outlineStore.removeAct(e.id);
      else if (e.type === 'relationship') characterStore.removeRelationship(e.id);
    });

    return `成功删除了 ${entities.length} 个实体`;
  }
};
