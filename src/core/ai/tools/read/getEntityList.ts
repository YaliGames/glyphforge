import { DecoupledTool, ToolContext } from '../index';

export const getEntityListTool: DecoupledTool = {
  name: 'getEntityList',
  description: '获取指定类型的实体索引列表。用于初步定位项目中存在的对象。规范：结果默认仅包含 ID 和名称标识，若需获取特定业务属性，必须在 fields 参数中显式声明。',
  isReadOnly: true,
  parameters: {
    type: 'object',
    properties: {
      type: { 
        type: 'string', 
        enum: ['character', 'worldview', 'relationship', 'timeline', 'chapters', 'manuscript', 'outline'], 
        description: '目标实体分类。' 
      },
      fields: { 
        type: 'array', 
        items: { type: 'string' }, 
        description: '可选：显式声明需要返回的业务属性字段。未声明则默认仅返回标识信息。' 
      }
    },
    required: ['type']
  },

  async execute(args: any, context: ToolContext) {
    const { type, fields } = args;
    const { projectStore } = context;
    const bundle = projectStore.bundle;
    
    if (!bundle) throw new Error('No project bundle found');

    const pickFields = (item: any) => {
      let source = { ...item };
      if (source.base) {
        Object.assign(source, source.base);
        delete source.base;
      }

      const result: any = { id: source.id || source.type };
      
      // 确定显示名称字段
      const nameField = source.name ? 'name' : (source.title ? 'title' : (source.label ? 'label' : null));
      if (nameField) result[nameField] = source[nameField];

      if (Array.isArray(fields)) {
        fields.forEach(f => {
          if (source[f] !== undefined && f !== 'id' && f !== nameField) {
            result[f] = source[f];
          }
        });
      }
      return result;
    };

    if (type === 'character') {
      return (bundle.characters || []).map((c: any) => pickFields(c));
    } else if (type === 'relationship') {
      return (bundle.relationships || []).map((r: any) => pickFields(r));
    } else if (type === 'outline') {
      return (bundle.outline?.structure.acts || []).map((a: any) => pickFields(a));
    } else if (type === 'worldview') {
      return (bundle.worldview?.categories || []).map((c: any) => pickFields(c));
    } else if (type === 'timeline') {
      return (bundle.worldview?.timeline || []).map((e: any) => pickFields(e));
    } else if (type === 'chapters' || type === 'manuscript') {
      const chapters: any[] = [];
      const flatten = (items: any[]) => {
        items.forEach((c: any) => {
          if (c.type === 'chapter' || c.type === 'scene') {
            chapters.push(pickFields(c));
          }
          if (c.children) flatten(c.children);
        });
      };
      flatten(bundle.chapters || []);
      return chapters;
    }

    return [];
  }
};
