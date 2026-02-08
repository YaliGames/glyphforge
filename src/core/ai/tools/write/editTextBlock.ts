import { DecoupledTool, ToolContext } from '../index';

export const editTextBlockTool: DecoupledTool = {
  name: 'editTextBlock',
  description: '对项目中的物理文本进行原子化修改。约束：1. search_text 必须与当前数据快照中的原始文本完全匹配；2. 严禁凭空修改未经过搜索确认存在的段落。',
  isReadOnly: false,
  parameters: {
    type: 'object',
    properties: {
      search_text: { type: 'string', description: '待替换的原始文本片段。必须确保物理存在。' },
      replace_text: { type: 'string', description: '更新后的目标文本内容。' },
      context_hint: { type: 'string', description: '可选：修改意图或背景说明。' }
    },
    required: ['search_text', 'replace_text']
  },
  async execute(args: any, context: ToolContext) {
    const { search_text, replace_text } = args;
    const { projectStore } = context;
    const bundle = projectStore.bundle;
    if (!bundle) throw new Error('No project bundle found');

    const fullOutline = (bundle.outline.content || []).join('\n');
    if (fullOutline.includes(search_text)) {
      bundle.outline.content = fullOutline.replace(search_text, replace_text).split('\n');
      return '已成功更新大纲文本段落';
    }

    const fullManuscript = (bundle.manuscript.content || []).join('\n');
    if (fullManuscript.includes(search_text)) {
      bundle.manuscript.content = fullManuscript.replace(search_text, replace_text).split('\n');
      return '已成功更新正文文本段落';
    }

    throw new Error('无法定位到指定的文本锚点');
  }
};
