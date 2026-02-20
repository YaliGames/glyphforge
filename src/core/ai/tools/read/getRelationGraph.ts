import { DecoupledTool, ToolContext } from '../index';

export const getRelationGraphTool: DecoupledTool = {
  name: 'getRelationGraph',
  description: '分析并提取指定角色的社交网络拓扑结构。深度 depth 建议在 1-3 之间。注意：返回结果包含节点间的关系权重、类型及双向描述。',
  isReadOnly: true,
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: '目标角色的 UUID。' },
      depth: { type: 'number', description: '关系展开层级（1-3），默认为 1。' }
    },
    required: ['id']
  },
  async execute(args: any, context: ToolContext) {
    const { id } = args;
    const { characterStore } = context;
    const nodes = characterStore.charactersInPhase.map((c: any) => ({ id: c.id, label: c.name }));
    const edges = characterStore.relationshipsInPhase.map((r: any) => ({ from: r.sourceId, to: r.targetId, label: r.label }));
    const data = { nodes, edges };
    return {
      status: 'success',
      data,
      message: `已为角色 ${id} 生成并拉取包含 ${nodes.length} 个节点和 ${edges.length} 条边的人物关系拓扑。`
    };
  }
};
