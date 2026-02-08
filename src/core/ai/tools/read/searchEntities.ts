import { DecoupledTool, ToolContext } from '../index';

export const searchEntitiesTool: DecoupledTool = {
  name: 'searchEntities',
  description: '跨域检索关键词。规范：1. 默认仅返回标识信息，若需读取业务属性必须在 fields 中显式声明；2. 正文检索返回的是孤立行结果，如需还原上下文语境，必须提取结果中的 line 坐标并通过 getEntityDetail(range) 读取。',
  isReadOnly: true,
  parameters: {
    type: 'object',
    properties: {
      type: { 
        type: 'string', 
        enum: ['character', 'worldview', 'relationship', 'timeline', 'chapters', 'manuscript', 'outline'],
        description: '搜索类型：manuscript (小说正文), outline (大纲幕), character (角色) 等。'
      },
      query: { type: 'string', description: '搜索关键词。' },
      fields: { 
        type: 'array', 
        items: { type: 'string' }, 
        description: '可选：显式声明需要返回的业务属性字段。未声明则仅返回标识信息。' 
      },
      limit: { type: 'number', description: '返回结果数量限制，默认 20。', default: 20 },
      offset: { type: 'number', description: '跳过的结果数量，用于分页。', default: 0 }
    },
    required: ['type', 'query']
  },
  async execute(args: any, context: ToolContext) {
    const { query, type, fields, limit = 20, offset = 0 } = args;
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
      // 搜大纲标题
      bundle.outline.structure.acts.forEach((a: any) => { 
        if (a.title.toLowerCase().includes(q)) results.push(pickFields(a, 'outline')); 
      });
      // 搜大纲手稿内容
      (bundle.outline.content || []).forEach((line: string, index: number) => {
        if (line.toLowerCase().includes(q)) {
          results.push({
            id: `outline-L${index + 1}`,
            type: 'outline',
            title: `大纲第${index + 1}行`,
            content: line.trim(),
            line: index + 1
          });
        }
      });
    }
    if (!type || type === 'chapters') {
      const flatten = (items: any[]) => {
        items.forEach((c: any) => {
          if (c.title.toLowerCase().includes(q)) results.push(pickFields(c, 'chapters'));
          if (c.children) flatten(c.children);
        });
      };
      flatten(bundle.chapters);
    }
    if (type === 'manuscript') {
      // 搜正文内容 - V1 统一大文件模式
      const lines = bundle.manuscript.content || [];
      
      // 平铺并过滤出有有效行号绑定的章节，按起始行号排序
      const sortedChapters: any[] = [];
      const collect = (items: any[]) => {
        items.forEach(c => {
          if (c.range && typeof c.range.startLine === 'number') {
            sortedChapters.push(c);
          }
          if (c.children) collect(c.children);
        });
      };
      collect(bundle.chapters);
      sortedChapters.sort((a, b) => a.range.startLine - b.range.startLine);

      lines.forEach((line: string, idx: number) => {
        if (line.toLowerCase().includes(q)) {
          const currentLine = idx + 1;
          
          // 逻辑：找到最后一个起始行号 <= 当前行号的章节
          let activeChapter = null;
          for (let i = sortedChapters.length - 1; i >= 0; i--) {
            if (sortedChapters[i].range.startLine <= currentLine) {
              activeChapter = sortedChapters[i];
              break;
            }
          }

          results.push({
            id: `manuscript-L${currentLine}`,
            type: 'manuscript',
            chapterId: activeChapter?.id || 'unknown',
            chapterTitle: activeChapter?.title || '未分类',
            line: currentLine,
            content: line.trim().slice(0, 150) + (line.length > 150 ? '...' : '')
          });
        }
      });
    }

    // 处理分页
    const total = results.length;
    const pagedResults = results.slice(offset, offset + limit);
    
    // 如果结果很多，在末尾添加一条提示
    if (total > offset + limit) {
      pagedResults.push({
        type: 'system_info',
        message: `更多提示：匹配到共 ${total} 条结果，当前仅展示第 ${offset + 1} 到 ${offset + limit} 条。如需更多请修改 offset 参数再次搜索。`
      });
    }
    
    return pagedResults;
  }
};
