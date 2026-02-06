import { DecoupledTool } from '../index';
import { generateAISchemaManual } from '../../schemaRegistry';

export const getEntitySchemaTool: DecoupledTool = {
  name: 'getEntitySchema',
  description: '获取指定实体类型的字段 definition 信息（Schema）。',
  isReadOnly: true,
  parameters: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['character', 'worldview', 'relationship', 'outline', 'chapters', 'manuscript'] }
    },
    required: ['type']
  },
  async execute() {
    return generateAISchemaManual() || '未知类型或暂未定义 Schema';
  }
};
