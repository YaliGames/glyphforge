import { DecoupledTool, ToolContext } from '../index';

export const editTextBlockTool: DecoupledTool = {
  name: 'editTextBlock',
  description: '精准修改或替换正文/大纲中的文本段落。',
  isReadOnly: false,
  parameters: {
    type: 'object',
    properties: {
      search_text: { type: 'string' },
      replace_text: { type: 'string' }
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
