import { AIPrompt } from '@/types/ai';

export const BUILTIN_PROMPTS: AIPrompt[] = [
  {
    id: 'builtin-expand',
    label: '文笔润色与扩写',
    description: '深度扩写片段，并提供文学性的修辞建议与逻辑分析',
    category: 'writing',
    content: `你是一位擅长氛围描写的文学导师。请基于下方提供的上下文和我的指令，对目标片段进行扩写。

你可以：
1. 直接在回复中给出扩写后的文本片段。
2. 如果你认为直接修改更方便，请调用 edit_text_block 工具。
3. 在文本后面附带你的创作思路和后续建议。

[ 项目上下文 ]
[JSON]

[ 创作指令 ]
[USER_INPUT]`
  },
  {
    id: 'builtin-character-design',
    label: '角色深度构建',
    description: '补全角色档案，并分析其性格冲突与动机',
    category: 'character',
    content: `你正在协助我设计角色细节。请基于世界观背景，补全正在设计的角色属性。

你可以：
1. 详细描述角色的外貌、性格和背景。
2. 使用 upsert_entities 工具直接将建议的属性同步到角色档案中。
3. 分析该角色与现有角色的潜在冲突。

[ 世界观上下文 ]
[JSON]

[ 基础设计信息 ]
[USER_INPUT]`
  },
  {
    id: 'builtin-worldview-design',
    label: '设定系统推演',
    description: '深化世界观条目，并推演可能产生的矛盾点',
    category: 'world',
    content: `你正在协助我进行世界观深度推演。请基于已有的设定，拓展我指定的维度。

你可以：
1. 详细推演该设定的历史由来、运行逻辑和社会影响。
2. 使用 upsert_entities 工具将新条目添加到百科中。

[ 现有设定基础 ]
[JSON]

[ 拓展目标与初步想法 ]
[USER_INPUT]`
  },
  {
    id: 'builtin-check',
    label: '设定一致性检查',
    description: '识别情节是否与已定义的世界观百科或人物档案存在冲突',
    category: 'general',
    content: `请扮演严谨的文学编辑。我将为你提供项目的百科数据以及我正在创作的情节段落。

请指出段落中是否存在与设定冲突的地方，并给出修改建议。如果你发现明显的逻辑漏洞，请通过对话告诉用户。

[ 百科数据 ]
[JSON]

[ 情节段落 ]
[USER_INPUT]`
  }
];
