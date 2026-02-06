import { DecoupledTool, ToolContext } from '../index';
import { getAIExportKeys, getIdentityKeys, getTechnicalKeys } from '../../schema-registry';

export const getEntityDetailTool: DecoupledTool = {
  name: 'getEntityDetail',
  description: '获取单个或多个实体的详细完整信息。对于 manuscript 或 outline，支持通过 range 参数获取特定行号范围的正文。',
  isReadOnly: true,
  parameters: {
    type: 'object',
    properties: {
      type: { 
        type: 'string', 
        enum: ['character', 'worldview', 'relationship', 'outline', 'chapters', 'manuscript'], 
        description: '实体类型' 
      },
      ids: { type: 'array', items: { type: 'string' }, description: '实体 ID 列表。支持 ["all"]。' },
      range: { 
        type: 'object', 
        properties: {
          start: { type: 'number', description: '起始物理行号' },
          end: { type: 'number', description: '结束物理行号' }
        }
      }
    },
    required: ['type', 'ids']
  },

  async execute(args: any, context: ToolContext) {
    const { type, ids, range } = args;
    const { projectStore } = context;
    if (!Array.isArray(ids)) throw new Error('ids must be an array');

    let details: any[] = [];
    const isSelectAll = ids.includes('all');
    const bundle = projectStore.bundle;
    if (!bundle) throw new Error('No project bundle found');

    if (type === 'character') {
      const list = bundle.characters || [];
      details = isSelectAll ? list : list.filter((c: any) => ids.includes(c.id));
    } else if (type === 'outline') {
      const list = bundle.outline?.structure.acts || [];
      const content = bundle.outline?.content || [];
      let effectiveRange = range;
      if (!effectiveRange && ids.length === 1 && ids[0].startsWith('range:')) {
        const parts = ids[0].replace('range:', '').split('-');
        if (parts.length === 2) {
          effectiveRange = { start: parseInt(parts[0]), end: parseInt(parts[1]) };
        }
      }
      if (effectiveRange) {
        const start = Math.max(0, effectiveRange.start - 1);
        const end = Math.min(content.length, effectiveRange.end);
        details = [{ id: ids[0], title: `大纲范围: ${effectiveRange.start}-${effectiveRange.end}`, content: content.slice(start, end).join('\n') }];
      } else {
        details = isSelectAll ? list : list.filter((a: any) => ids.includes(a.id));
      }
    } else if (type === 'worldview') {
      const list = bundle.worldview?.categories || [];
      details = isSelectAll ? list : list.filter((c: any) => ids.includes(c.type));
    } else if (type === 'timeline') {
      details = bundle.worldview?.timeline || [];
    } else if (type === 'chapters') {
      const all: any[] = [];
      const flatten = (items: any[]) => {
        items.forEach((c: any) => { all.push(c); if (c.children) flatten(c.children); });
      };
      flatten(bundle.chapters || []);
      details = isSelectAll ? all : all.filter((c: any) => ids.includes(c.id));
    } else if (type === 'manuscript') {
      const manuscript = bundle.manuscript.content || [];
      let effectiveRange = range;
      if (!effectiveRange && ids.length === 1 && ids[0].startsWith('range:')) {
        const parts = ids[0].replace('range:', '').split('-');
        if (parts.length === 2) effectiveRange = { start: parseInt(parts[0]), end: parseInt(parts[1]) };
      }
      if (effectiveRange) {
        const start = Math.max(0, effectiveRange.start - 1);
        const end = Math.min(manuscript.length, effectiveRange.end);
        details = [{ id: ids[0], title: `正文范围: ${effectiveRange.start}-${effectiveRange.end}`, content: manuscript.slice(start, end).join('\n') }];
      } else if (isSelectAll) {
        details = [{ id: 'all', title: '全集正文', content: manuscript.join('\n') }];
      } else {
        // 基于章节锚点获取内容 (逻辑同之前)
        const allAnchorLines: number[] = [];
        const allNodes: any[] = [];
        const collect = (items: any[]) => {
          items.forEach((c: any) => {
            allNodes.push(c);
            if (typeof c.anchorLineNumber === 'number') allAnchorLines.push(c.anchorLineNumber);
            if (c.children) collect(c.children);
          });
        };
        collect(bundle.chapters);
        allAnchorLines.sort((a, b) => a - b);
        details = ids.map(id => {
          const node = allNodes.find((n: any) => n.id === id);
          if (node && typeof node.anchorLineNumber === 'number') {
            const startIdx = node.anchorLineNumber - 1;
            const nextAnchor = allAnchorLines.find(line => line > node.anchorLineNumber);
            const endIdx = nextAnchor ? nextAnchor - 1 : manuscript.length;
            return { id: node.id, title: node.title, content: manuscript.slice(startIdx, endIdx).join('\n') };
          }
          return { id, error: 'Chapter not found' };
        });
      }
    }

    // 处理数据清洗
    return details.map(item => {
      let source = { ...item };
      if (source.base) { Object.assign(source, source.base); delete source.base; }
      const exportKeys = getAIExportKeys(type);
      const identityKeys = getIdentityKeys();
      const technicalKeys = getTechnicalKeys();
      const cleaned: any = {};
      for (const [key, value] of Object.entries(source)) {
        if (exportKeys.includes(key) || identityKeys.includes(key)) {
          if (technicalKeys.includes(key) && !identityKeys.includes(key)) continue;
          cleaned[key] = value;
        }
      }
      return cleaned;
    });
  }
};
