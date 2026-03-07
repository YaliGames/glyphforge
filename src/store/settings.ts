import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SETTINGS_SCHEMA, type AIProfile } from '@/config/settings.schema'
import { STORAGE_KEYS } from '@/config'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Record<string, any>>({})
  const expandedStates = ref<Record<string, boolean>>({})

  // 初始化设置
  function initSettings() {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS)
    const initial: Record<string, any> = {}

    // 注入默认值
    SETTINGS_SCHEMA.forEach(section => {
      section.items.forEach(item => {
        initial[item.key] = item.default
      })
    })

    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // 合并已保存的值
        Object.assign(initial, parsed)

        // 特殊检查：如果 ai.profiles 为空，重新注入默认值
        if (!initial['ai.profiles'] || (Array.isArray(initial['ai.profiles']) && initial['ai.profiles'].length === 0)) {
          const aiProfileItem = SETTINGS_SCHEMA.find(s => s.id === 'ai')?.items.find(i => i.key === 'ai.profiles')
          if (aiProfileItem) {
            initial['ai.profiles'] = aiProfileItem.default
          }
        }
      } catch (e) {
        console.error('Failed to parse settings', e)
      }
    }
    settings.value = initial
  }

  function updateSetting(key: string, value: any) {
    settings.value[key] = value
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings.value))
  }

  /**
   * 返回所有设置项
   */
  function getSettings() {
    return settings.value
  }

  /**
   * 获取单个设置项
   */
  function getSetting(key: string, defaultValue: any = undefined) {
    return settings.value[key] !== undefined ? settings.value[key] : defaultValue
  }

  /**
   * 切换设置项的展开/折叠状态
   */
  function toggleExpanded(key: string) {
    expandedStates.value[key] = !expandedStates.value[key]
  }

  /**
   * 获取设置项的展开状态
   */
  function isExpanded(key: string) {
    return expandedStates.value[key] ?? false
  }

  /**
   * AI 多配置扩展
   * 返回包含具体 model 字段的活动配置对象
   */
  const activeAIProfile = computed(() => {
    const profiles = (settings.value['ai.profiles'] || []) as AIProfile[]
    const activeKey = settings.value['ai.activeProfileId'] as string

    if (!activeKey || !activeKey.includes(':')) return null

    const [profileId, modelName] = activeKey.split(':')
    const profile = profiles.find(p => p.id === profileId)

    if (!profile) return null

    return {
      ...profile,
      model: modelName
    }
  })

  const availableAIProfiles = computed(() => {
    const profiles = (settings.value['ai.profiles'] || []) as AIProfile[]
    const options: { label: string; value: string }[] = []

    profiles.forEach(p => {
      if (p.models && p.models.length > 0) {
        p.models.forEach(m => {
          options.push({
            label: `${p.name} (${m})`,
            value: `${p.id}:${m}`
          })
        })
      }
    })

    return options
  })

  /**
   * 动态生成配置 Schema，注入运行时数据（如 AI 模型列表）
   */
  const dynamicSchema = computed(() => {
    return SETTINGS_SCHEMA.map(section => ({
      ...section,
      items: section.items.map(item => {
        if (item.key === 'ai.activeProfileId') {
          return {
            ...item,
            options: availableAIProfiles.value
          }
        }
        return item
      })
    }))
  })

  // 系统深色模式媒体查询
  const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const isSystemDark = ref(systemDarkQuery.matches)

  // 监听系统主题变化
  systemDarkQuery.addEventListener('change', (e: MediaQueryListEvent) => {
    isSystemDark.value = e.matches
  })

  // 计算最终的深色模式状态
  const isDarkMode = computed(() => {
    const mode = settings.value['general.theme']
    if (mode === 'on') return true
    if (mode === 'off') return false
    return isSystemDark.value
  })

  // 初始化设置
  initSettings()

  return {
    settings,
    getSettings,
    getSetting,
    updateSetting,
    toggleExpanded,
    isExpanded,
    isDarkMode,
    activeAIProfile,
    availableAIProfiles,
    dynamicSchema
  }
})
