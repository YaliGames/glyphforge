import { GlyphForgeBundle, GlyphForgeProject } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class BundleManager {
  /**
   * 创建一个全新的项目包
   */
  static createNewProject(title: string): GlyphForgeBundle {
    const projectId = uuidv4();
    const now = new Date().toISOString();

    const project: GlyphForgeProject = {
      id: projectId,
      title: title || '未命名项目',
      description: '',
      createdAt: now,
      updatedAt: now,
      hierarchies: [
        { depth: 0, name: '卷' },
        { depth: 1, name: '章' },
        { depth: 2, name: '节' },
        { depth: 3, name: '场' }
      ]
    };

    return {
      version: '1.0.0',
      project,
      manuscript: {
        content: [],
        lastUpdated: now
      },
      worldview: {
        id: uuidv4(),
        projectId,
        type: 'world',
        categories: [
          { type: 'geography', name: '地理环境', summary: '', details: [] },
          { type: 'politics', name: '势力结构', summary: '', details: [] },
          { type: 'culture', name: '风土人情', summary: '', details: [] },
          { type: 'magic', name: '特殊力量', summary: '', details: [] }
        ],
        timeline: []
      },
      outline: {
        id: uuidv4(),
        projectId,
        content: [],
        narrative: { notes: '' },
        structure: { acts: [], dependencies: [] }
      },
      characters: [],
      relationships: [],
      chapters: [],
      authorNotes: [],
      settings: {}
    };
  }

  /**
   * 将 Bundle 序列化为 JSON 字符串
   */
  static serialize(bundle: GlyphForgeBundle): string {
    bundle.project.updatedAt = new Date().toISOString();
    this.normalize(bundle);
    return JSON.stringify(bundle, null, 2);
  }

  /**
   * 标准化数据结构（排序、清理无效引用等）
   */
  static normalize(bundle: GlyphForgeBundle) {
    // 大纲结构排序：有 range 的按 startLine 排序，没有 range 的置后
    if (bundle.outline?.structure?.acts) {
      bundle.outline.structure.acts.sort((a, b) => {
        const hasA = a.range && typeof a.range.startLine === 'number';
        const hasB = b.range && typeof b.range.startLine === 'number';
        
        if (hasA && hasB) {
          return a.range!.startLine - b.range!.startLine;
        }
        if (hasA) return -1;
        if (hasB) return 1;
        
        // 如果都无绑定，保持稳定排序（可选：按标题排序）
        return 0;
      });
    }

    // 数据完整性检查
    if (!bundle.relationships) {
      bundle.relationships = [];
    }
  }

  /**
   * 从 JSON 字符串解析 Bundle
   */
  static deserialize(json: string): GlyphForgeBundle {
    const data = JSON.parse(json);
    
    if (!data.version || !data.project) {
      throw new Error('无效的项目文件格式');
    }

    if (!data.outline?.content) {
      data.outline = { ...data.outline, content: [] };
    }

    this.normalize(data as GlyphForgeBundle);

    return data as GlyphForgeBundle;
  }
}
