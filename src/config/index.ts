export const APP_CONFIG = {
  name: 'GlyphForge',
  version: '0.2.0',
  tag: null,
  projectExtension: '.gfp',
  author: 'GlyphForge Project',
  copyright: '2025-2026 GlyphForge Project. 保留所有权利。',
  links: {
    github: 'https://github.com/YaliGames/glyphforge',
    docs: 'https://github.com/YaliGames/glyphforge/wiki',
    releases: 'https://github.com/YaliGames/glyphforge/releases',
    feedback: 'https://github.com/YaliGames/glyphforge/issues',
    license: 'https://github.com/YaliGames/glyphforge/blob/main/LICENSE',
    privacy: 'https://github.com/YaliGames/glyphforge/wiki/Privacy-Policy'
  }
} as const

/**
 * 快速入门与提示信息
 */
export const QUICK_START_GUIDE = [
  {
    title: '创建第一个故事',
    content: '学习如何使用 Glyphforge 开始创作您的小说。',
    url: 'https://example.com/#/topic/quick-start'
  },
  {
    title: '开发新的 AI 工具',
    content: '了解如何为 Glyphforge 开发和集成新的 AI 工具。',
    url: 'https://example.com/#/topic/ai-tools'
  }
] as const

/**
 * 带有描述的常用链接
 */
export const DESCRIPTIVE_LINKS = [
  { 
    title: '官方文档', 
    desc: '全面了解 GlyphForge 的功能与使用方法', 
    icon: 'fa-solid fa-book', 
    url: APP_CONFIG.links.docs 
  },
  { 
    title: 'GitHub 源代码', 
    desc: '查看或贡献项目代码', 
    icon: 'fa-brands fa-github', 
    url: APP_CONFIG.links.github 
  },
  { 
    title: '更新日志', 
    desc: '查看每次版本更新的详细内容', 
    icon: 'fa-solid fa-clock-rotate-left', 
    url: APP_CONFIG.links.releases 
  }
] as const

/**
 * 存储相关的 Key
 */
export const STORAGE_KEYS = {
  CUSTOM_PROMPTS: 'glyphforge-custom-prompts',
  SETTINGS: 'glyphforge-settings',
  RECENT_FILES: 'glyphforge-recent-files',
  SIDEBAR_LEFT_WIDTH: 'glyphforge-sidebar-left-width',
  SIDEBAR_RIGHT_WIDTH: 'glyphforge-sidebar-right-width',
} as const

/**
 * 世界观设定维度预设定义
 */
export const WORLDVIEW_PRESET_CATEGORIES = [
  { type: 'geography', name: '地理环境', icon: 'fa-earth-asia', desc: '地形地貌、气候分布、自然资源' },
  { type: 'politics', name: '势力结构', icon: 'fa-crown', desc: '权力结构、法律条文、外交关系' },
  { type: 'culture', name: '社会习俗', icon: 'fa-masks-theater', desc: '民族传统、节日礼仪、饮食服饰' },
  { type: 'military', name: '军事力量', icon: 'fa-shield-halved', desc: '兵种编制、武器装备、战争艺术' },
  { type: 'religion', name: '宗教信仰', icon: 'fa-hamsa', desc: '教会组织、神话传说、禁忌信条' },
  { type: 'magic', name: '特殊力量', icon: 'fa-wand-sparkles', desc: '超自然能力、魔法等级、技能代价' },
  { type: 'technology', name: '科学技术', icon: 'fa-microchip', desc: '发明创造、能源动力、工业水平' },
  { type: 'economy', name: '经济贸易', icon: 'fa-coins', desc: '货币体系、商业往来、贫富差距' },
  { type: 'history', name: '历史纪元', icon: 'fa-landmark', desc: '重大事件、文明更迭、传说史诗' }
] as const
