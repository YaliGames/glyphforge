import { DecoupledTool, ToolContext } from '../index';

export const getRelationGraphTool: DecoupledTool = {
  name: 'getRelationGraph',
  description: '获取指定实体的关系网络。',
  isReadOnly: true,
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      depth: { type: 'number' }
    },
    required: ['id']
  },
  async execute(_args: any, context: ToolContext) {
    const { characterStore } = context;
    const nodes = characterStore.charactersInPhase.map((c: any) => ({ id: c.id, label: c.name }));
    const edges = characterStore.relationshipsInPhase.map((r: any) => ({ from: r.sourceId, to: r.targetId, label: r.label }));
    return { nodes, edges };
  }
};
