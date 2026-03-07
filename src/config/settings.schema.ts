import type { AppAction } from '@/types/project';

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
  models: string[];
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
  expandable?: boolean;           // 标记为可展开的父项
  childrenLabel?: string;         // 展开后显示的标签
  children?: SettingItem[];       // 子项数组
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
    name: 'OpenAI',
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4o-mini'],
    template: '',
    responsePath: ''
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    provider: 'openai',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'],
    template: '',
    responsePath: ''
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    provider: 'openai',
    endpoint: 'https://api.anthropic.com/v1/messages',
    models: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229'],
    template: '',
    responsePath: ''
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    provider: 'openai',
    endpoint: 'https://api.deepseek.com/chat/completions',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    template: '',
    responsePath: ''
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    provider: 'openai',
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    models: ['deepseek-ai/deepseek-v3', 'qwen/qwen2.5-72b-instruct', 'meta/llama-3.1-405b-instruct', 'mistralai/mixtral-8x22b-instruct-v0.1'],
    template: '',
    responsePath: ''
  },
  {
    id: 'aliyun-openai',
    name: 'Aliyun (OpenAI)',
    provider: 'openai',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    models: ['qwen-plus', 'qwen-max', 'qwen-turbo'],
    template: '',
    responsePath: ''
  },
  {
    id: 'aliyun-native',
    name: 'Aliyun (Native)',
    provider: 'custom',
    endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    models: ['qwen-plus'],
    template: '{"model": "${model}", "input": {"messages": ${messages}}, "parameters": {"result_format": "message"}}',
    responsePath: 'output.choices[0].message.content'
  },
  {
    id: 'custom',
    name: '自定义',
    provider: 'custom',
    endpoint: '',
    models: [],
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
        default: [
          {
            id: 'default-openai',
            name: 'OpenAI',
            provider: 'openai',
            apiKey: '',
            endpoint: 'https://api.openai.com/v1/chat/completions',
            models: ['gpt-4o', 'gpt-4o-mini'],
            template: '',
            responsePath: ''
          }
        ],
        dependsOn: { key: 'ai.enabled', value: true }
      }
    ]
  },
  {
    id: 'safety',
    label: '安全与数据',
    icon: 'fa-shield',
    items: [
      {
        key: 'safety.deleteConfirmationEnabled',
        label: '删除操作需要确认',
        description: '关闭后，所有删除操作将不显示确认对话框。无论是否启用，删除操作都支持撤销。',
        type: 'boolean',
        default: true,
        expandable: true,
        childrenLabel: '更多',
        children: [
          {
            key: 'safety.confirmDeleteOutlineStructure',
            label: '删除大纲结构',
            description: '删除大纲结构时是否显示确认对话框',
            type: 'boolean',
            default: true
          },
          {
            key: 'safety.confirmDeleteChapter',
            label: '删除章节',
            description: '删除章节时是否显示确认对话框',
            type: 'boolean',
            default: true
          },
          {
            key: 'safety.confirmDeleteCharacter',
            label: '删除角色',
            description: '删除人物角色时是否显示确认对话框',
            type: 'boolean',
            default: true
          },
          {
            key: 'safety.confirmDeleteWorldviewCategory',
            label: '删除设定维度',
            description: '删除世界观设定维度时是否显示确认对话框',
            type: 'boolean',
            default: true
          },
          {
            key: 'safety.confirmDeleteWorldviewItem',
            label: '删除设定条目',
            description: '删除设定维度中的条目时是否显示确认对话框',
            type: 'boolean',
            default: true
          },
          {
            key: 'safety.confirmDeleteTimelineEvent',
            label: '删除时间线事件',
            description: '删除时间线事件时是否显示确认对话框',
            type: 'boolean',
            default: true
          }
        ]
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
