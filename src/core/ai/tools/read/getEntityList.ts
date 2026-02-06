import { DecoupledTool, ToolContext } from '../index';

export const getEntityListTool: DecoupledTool = {
  name: 'getEntityList',
  description: '获取某一实体类型下的实体列表概要信息，用于了解项目中“有哪些对象可被引用”。',
  isReadOnly: true,
  parameters: {
    type: 'object',
    properties: {
      type: { 
        type: 'string', 
        enum: ['character', 'worldview', 'relationship', 'timeline', 'chapters', 'manuscript'], 
        description: '实体类型' 
      },
      fields: { 
        type: 'array', 
        items: { type: 'string' }, 
        description: '需要返回的额外字段列表，默认仅返回 name/title。' 
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
