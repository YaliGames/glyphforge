import { DecoupledTool, ToolContext } from '../index';
import { getAIExportKeys, getIdentityKeys, getTechnicalKeys } from '../../schemaRegistry';

export const getEntityDetailTool: DecoupledTool = {
  name: 'getEntityDetail',
  description: '通过物理 ID 获取实体的全量详情或特定文本切片。规范：1. 设定类 IDs 必须为真实 UUID；2. 正文类 IDs 必须为章节 ID（ch-xxx），严禁传入虚拟行号标识符；3. 文本类对象支持配合 range 参数进行物理范围截取。',
  isReadOnly: true,
  parameters: {
    type: 'object',
    properties: {
      type: { 
        type: 'string', 
        enum: ['character', 'worldview', 'relationship', 'outline', 'chapters', 'manuscript'], 
        description: '实体类型。' 
      },
      ids: { 
        type: 'array', 
        items: { type: 'string' }, 
        description: '目标实体的 ID 集合，设定类为 UUID；世界观类为分类 ID (如 geography)；正文类为章节 ID。支持 ["all"] 获取全部对象。' 
      },
      range: { 
        type: 'object', 
        properties: {
          start: { type: 'number', description: '起始物理行号（1-indexed）。' },
          end: { type: 'number', description: '结束物理行号（1-indexed）。' }
        },
        description: '可选：物理行号范围。仅在 type 为 manuscript 或 outline 时有效。若提供了此参数，ids 可省略。'
      }
    },
    required: ['type']
  },

  async execute(args: any, context: ToolContext) {
    const { type, ids = [], range } = args;
    const { projectStore } = context;

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
        const lines = content.slice(start, end).map((line: string, idx: number) => `${start + idx + 1}: ${line}`);
        details = [{ id: ids[0] || 'range-selection', title: `大纲范围: ${effectiveRange.start}-${effectiveRange.end}`, content: lines.join('\n') }];
      } else if (ids.includes('full-text') || ids.includes('all')) {
        const lines = content.map((line: string, idx: number) => `${idx + 1}: ${line}`);
        details = [{ id: 'all', title: '大纲全集手稿', content: lines.join('\n') }];
      } else {
        const filtered = isSelectAll ? list : list.filter((a: any) => ids.includes(a.id));
        details = filtered.map((act: any) => {
          const actClone = { ...act };
          if (act.range) {
            const start = Math.max(0, act.range.startLine - 1);
            const end = Math.min(content.length, act.range.endLine);
            actClone.textSegments = content.slice(start, end).map((line: string, idx: number) => `${start + idx + 1}: ${line}`);
          }
          return actClone;
        });
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
        const lines = manuscript.slice(start, end).map((line: string, idx: number) => `${start + idx + 1}: ${line}`);
        details = [{ id: ids[0] || 'range-selection', title: `正文范围: ${effectiveRange.start}-${effectiveRange.end}`, content: lines.join('\n') }];
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
        details = ids.map((id: string) => {
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
    return details.map((item: any) => {
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
