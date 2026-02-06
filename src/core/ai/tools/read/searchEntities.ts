import { DecoupledTool, ToolContext } from '../index';

export const searchEntitiesTool: DecoupledTool = {
  name: 'searchEntities',
  description: '基于关键词在实体集合中进行搜索。',
  isReadOnly: true,
  parameters: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['character', 'worldview', 'relationship', 'timeline', 'chapters', 'manuscript'] },
      query: { type: 'string' },
      fields: { type: 'array', items: { type: 'string' } }
    },
    required: ['type', 'query']
  },
  async execute(args: any, context: ToolContext) {
    const { query, type, fields } = args;
    const { projectStore } = context;
    const results: any[] = [];
    const q = (query || '').toLowerCase();
    const bundle = projectStore.bundle;
    if (!bundle) return [];

    const pickFields = (item: any, itemType: string) => {
      let source = { ...item };
      if (source.base) { Object.assign(source, source.base); delete source.base; }
      const result: any = { id: source.id || source.type, type: itemType };
      const nameField = source.name ? 'name' : (source.title ? 'title' : (source.label ? 'label' : null));
      if (nameField) result[nameField] = source[nameField];
      if (Array.isArray(fields)) {
        fields.forEach(f => { if (source[f] !== undefined && f !== 'id' && f !== nameField) result[f] = source[f]; });
      }
      return result;
    };

    if (!type || type === 'character') {
      bundle.characters.forEach((c: any) => { if (c.base.name.toLowerCase().includes(q)) results.push(pickFields(c, 'character')); });
    }
    if (!type || type === 'outline') {
      bundle.outline.structure.acts.forEach((a: any) => { if (a.title.toLowerCase().includes(q)) results.push(pickFields(a, 'outline')); });
    }
    if (!type || type === 'chapters' || type === 'manuscript') {
      const flatten = (items: any[]) => {
        items.forEach((c: any) => {
          if (c.title.toLowerCase().includes(q)) results.push(pickFields(c, type || 'chapters'));
          if (c.children) flatten(c.children);
        });
      };
      flatten(bundle.chapters);
    }
    return results.slice(0, 10);
  }
};
