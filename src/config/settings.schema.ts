export interface SettingOption {
  label: string;
  value: any;
}

export interface AIProfile {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'custom';
  apiKey: string;
  endpoint: string;
  model: string;
  template?: string;
  responsePath?: string;
}

export type SettingType = 'boolean' | 'string' | 'number' | 'select' | 'action';

export interface SettingItem {
  key: string;
  label: string;
  description: string;
  type?: SettingType;
  action?: AppAction;
  buttonLabel?: string;
  icon?: string;
  options?: Array<{ label: string; value: any }>;
  default: any;
  dependsOn?: {
    key: string;
    value: any;
  };
  hidden?: boolean;
}

export interface SettingSection {
  id: string;
  label: string;
  icon: string;
  items: SettingItem[];
}

export const AI_PROFILE_TEMPLATES = [
  {
    id: 'openai',
    name: 'OpenAI (Standard)',
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    template: '',
    responsePath: ''
  },
  {
    id: 'gemini',
    name: 'Google Gemini (OpenAI API)',
    provider: 'openai',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-1.5-pro',
    template: '',
    responsePath: ''
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    provider: 'openai',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-sonnet-20240620',
    template: '',
    responsePath: ''
  },
  {
    id: 'aliyun-openai',
    name: 'Aliyun DashScope (OpenAI Compatible)',
    provider: 'openai',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-plus',
    template: '',
    responsePath: ''
  },
  {
    id: 'aliyun-native',
    name: 'Aliyun DashScope (Native)',
    provider: 'custom',
    endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    model: 'qwen-plus',
    template: '{"model": "${model}", "input": {"messages": ${messages}}, "parameters": {"result_format": "message"}}',
    responsePath: 'output.choices[0].message.content'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    provider: 'openai',
    endpoint: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    template: '',
    responsePath: ''
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM (build.nvidia.com)',
    provider: 'openai',
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'meta/llama-3.1-405b-instruct',
    template: '',
    responsePath: ''
  },
  {
    id: 'custom',
    name: 'Custom (自定义)',
    provider: 'custom',
    endpoint: '',
    model: '',
    template: '{\n  "model": "${model}",\n  "messages": ${messages}\n}',
    responsePath: 'choices[0].message.content'
  }
];

export const SETTINGS_SCHEMA: SettingSection[] = [
  {
    id: 'general',
    label: '常规',
    icon: 'fa-cog',
    items: [
      {
        key: 'general.language',
        label: '界面语言',
        description: '选择应用程序的显示语言。',
        type: 'select',
        default: 'zh-CN',
        options: [
          { label: '简体中文', value: 'zh-CN' },
          { label: 'English', value: 'en-US' }
        ]
      },
      {
        key: 'general.theme',
        label: '外观主题',
        description: '切换界面的深色或浅色模式。',
        type: 'select',
        default: 'system',
        options: [
          { label: '浅色', value: 'off' },
          { label: '深色', value: 'on' },
          { label: '跟随系统', value: 'system' }
        ]
      }
    ]
  },
  {
    id: 'editor',
    label: '编辑器',
    icon: 'fa-edit',
    items: [
      {
        key: 'editor.fontSize',
        label: '字体大小',
        description: '控制编辑器中的字号大小（像素）。',
        type: 'number',
        default: 16
      },
      {
        key: 'editor.lineHeight',
        label: '行高',
        description: '控制编辑器的行间距（倍数）。',
        type: 'number',
        default: 1.8
      },
      {
        key: 'editor.showChapterHighlight',
        label: '章节高亮',
        description: '在编辑器侧边显示章节位置提示。',
        type: 'boolean',
        default: true
      }
    ]
  },
  {
    id: 'ai',
    label: 'AI 创作助手',
    icon: 'fa-wand-magic-sparkles',
    items: [
      {
        key: 'ai.enabled',
        label: '启用 AI 功能',
        description: '开启或关闭全局 AI 写作建议、角色设计推演等功能。',
        type: 'boolean',
        default: true
      },
      {
        key: 'ai.activeProfileId',
        label: '当前活动模型',
        description: '选择当前用于生成内容的 AI 配置。',
        type: 'select',
        default: null,
        options: [],
        dependsOn: { key: 'ai.enabled', value: true }
      },
      {
        key: 'ai.profiles',
        label: '模型配置管理',
        description: '管理多个 AI 模型供应商、API 密钥和自定义端点。',
        type: 'action',
        action: 'open-ai-profiles',
        buttonLabel: '管理模型配置',
        default: null,
        dependsOn: { key: 'ai.enabled', value: true }
      }
    ]
  },
  {
    id: 'dev',
    label: '开发人员选项',
    icon: 'fa-code',
    items: [
      {
        key: 'dev.devTools',
        label: '开发人员工具',
        description: '打开开发人员工具面板，仅Electron环境下可用。',
        type: 'action',
        action: 'dev-tools',
        buttonLabel: '开发人员工具',
        default: null
      },
      {
        key: 'dev.toggleFullscreen',
        label: 'handleAction测试',
        description: '调用handleAction: toggle-fullscreen',
        type: 'action',
        action: 'toggle-fullscreen',
        buttonLabel: '调用',
        default: null
      }
    ]
  }
];
