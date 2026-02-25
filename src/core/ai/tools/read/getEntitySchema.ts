import { DecoupledTool } from '../index';
import { generateAISchemaManual } from '../../schemaRegistry';

export const getEntitySchemaTool: DecoupledTool = {
  name: 'getEntitySchema',
  description: '查询实体的元数据定义（Schema）。当不确定目标对象包含哪些属性字段或合法字段名时，必须优先调用此工具，以确保后续变更操作的参数合法性。',
  isReadOnly: true,
  parameters: {
    type: 'object',
    properties: {
      type: { 
        type: 'string', 
        enum: ['character', 'worldview', 'relationship', 'outline', 'chapters', 'manuscript', 'timeline'],
        description: '目标实体分类。'
      }
    },
    required: ['type']
  },
  async execute(args: any) {
    const { type } = args;
    const manual = generateAISchemaManual();
    return {
      status: 'success',
      data: {
        type,
        schema: manual
      },
      message: `已获取 ${type} 的实体元数据定义。`
    };
  }
};
