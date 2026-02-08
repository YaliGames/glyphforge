export const APP_CONFIG = {
  name: 'GlyphForge',
  version: '0.1.2',
  tag: 'Beta',
  projectExtension: '.gfp',
  author: 'GlyphForge Project',
  copyright: '2025-2026 GlyphForge Project. 保留所有权利。',
  links: {
    github: 'https://github.com/glyphforge/app',
    docs: 'https://github.com/glyphforge/app/wiki',
    releases: 'https://github.com/glyphforge/app/releases',
    feedback: 'https://github.com/glyphforge/app/issues',
    license: 'https://github.com/glyphforge/app/blob/main/LICENSE',
    privacy: 'https://github.com/glyphforge/app/wiki/Privacy-Policy'
  }
} as const

/**
 * 存储相关的 Key
 */
export const STORAGE_KEYS = {
  CUSTOM_PROMPTS: 'glyphforge-custom-prompts',
  SETTINGS: 'glyphforge-settings',
  RECENT_FILES: 'glyphforge-recent-files',
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
