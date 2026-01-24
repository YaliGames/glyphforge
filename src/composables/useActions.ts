import { useRouter } from 'vue-router'
import { useUIStore } from '@/store/ui'
import { useSettingsStore } from '@/store/settings'
import { useProjectStore } from '@/store/project'
import { useChapterStore } from '@/store/chapters'
import { useAIStore } from '@/store/ai'
import { fsProvider } from '@/core/bridge'
import { APP_CONFIG } from '@/config'
import { isElectron } from '@/utils/env'
import type { AppAction } from '@/types'

export function useActions() {
  const router = useRouter()
  const uiStore = useUIStore()
  const settingsStore = useSettingsStore()
  const projectStore = useProjectStore()
  const chapterStore = useChapterStore()
  const aiStore = useAIStore()

  /**
   * 确保当前工作已保存，返回 true 表示可以继续后续操作，false 表示取消
   */
  async function ensureSaved(): Promise<boolean> {
    if (!projectStore.isDirty) return true

    const result = await uiStore.showConfirm({
      title: '未保存修改',
      message: '是否保存对当前项目的更改？',
      confirmText: '保存',
      extraText: '不保存',
      cancelText: '取消',
      type: 'warning'
    })

    if (result === true) {
      // 保存并继续
      const saved = projectStore.currentProject?.path 
        ? await projectStore.saveProject()
        : await projectStore.saveProjectAs()
      return saved
    } else if (result === 'extra') {
      // 不保存，直接继续
      return true
    }
    
    // 取消
    return false
  }

  /**
   * 唤起 AI 助手面板，支持传递预选参考内容
   */
  function invokeAI(payload?: string[]) {
    if (payload && Array.isArray(payload)) {
      const granular: Record<string, boolean> = {}
      payload.forEach(k => granular[k] = true)
      aiStore.show({ granular })
    } else {
      aiStore.toggle()
    }
  }

  /**
   * 安全地打开外部链接
   */
  async function openExternalLink(url: string) {
    const confirmed = await uiStore.showConfirm({
      title: '打开外部链接',
      message: '将打开外部链接，是否继续？',
      confirmText: '继续',
      cancelText: '取消',
      type: 'info'
    })

    if (confirmed === true) {
      if (isElectron && (window as any).electronAPI?.openExternal) {
        (window as any).electronAPI.openExternal(url)
      } else {
        window.open(url, '_blank')
      }
    }
  }

  async function handleAction(id: AppAction, payload?: any) {
    switch (id) {
      case 'new-project':
        if (await ensureSaved()) {
          projectStore.createProject('新故事')
          router.push('/outline')
        }
        break
      case 'open-project':
        if (await ensureSaved()) {
          let path = payload
          if (typeof path !== 'string') {
            const result = await fsProvider.readFile({
              filters: [{ name: `${APP_CONFIG.name}项目文件`, extensions: [APP_CONFIG.projectExtension.replace('.', '')] }]
            })
            path = result?.path
          }

          if (path) {
            const success = await projectStore.openProject(path)
            if (success) {
              router.push('/outline')
              uiStore.showToast('项目已加载', 'success')
            }
          }
        }
        break
      case 'import-txt':
        try {
          const importResult = await fsProvider.readFile({
            filters: [{ name: '文本文件', extensions: ['txt', 'md'] }]
          })
          if (importResult && importResult.content) {
            if (chapterStore.manuscriptContent.trim().length > 0) {
              const confirmed = await uiStore.showConfirm({
                title: '覆盖确认',
                message: '导入文本将覆盖当前项目的正文内容，此操作不可撤销。是否继续？',
                confirmText: '确认导入',
                cancelText: '取消',
                type: 'warning'
              })
              if (!confirmed) return
            }
            chapterStore.manuscriptContent = importResult.content
            uiStore.showToast('文本已成功导入', 'success')
            if (router.currentRoute.value.path !== '/editor') {
              router.push('/editor')
            }
          }
        } catch (e) {
          console.log('Import skipped or failed', e)
        }
        break
      case 'save':
        if (projectStore.currentProject?.path) {
          await projectStore.saveProject()
        } else {
          await projectStore.saveProjectAs()
        }
        break
      case 'save-as':
        await projectStore.saveProjectAs()
        break
      case 'undo':
        projectStore.undo()
        break
      case 'redo':
        projectStore.redo()
        break
      case 'find':
        window.dispatchEvent(new CustomEvent('monaco-find'))
        break
      case 'replace':
        window.dispatchEvent(new CustomEvent('monaco-replace'))
        break
      case 'goto-welcome': 
        if (await ensureSaved()) {
          router.push('/')
        }
        break
      case 'goto-outline': router.push('/outline'); break
      case 'goto-editor': router.push('/editor'); break
      case 'goto-characters': router.push('/characters'); break
      case 'goto-worldview': router.push('/worldview'); break
      case 'goto-timeline': router.push('/timeline'); break
      case 'settings': router.push('/settings'); break
      case 'about': router.push('/about'); break
      case 'build-info': uiStore.showBuildInfoModal = true; break
      case 'open-settings': uiStore.showSettingsModal = true; break
      
      case 'license':
        await openExternalLink(APP_CONFIG.links.license)
        break
      case 'privacy-policy':
        await openExternalLink(APP_CONFIG.links.privacy)
        break
      case 'check-updates':
        await openExternalLink(APP_CONFIG.links.releases)
        break
      case 'report-issue':
        await openExternalLink(APP_CONFIG.links.feedback)
        break

      // 主题快速切换
      case 'theme-dark': settingsStore.updateSetting('general.theme', 'on'); break
      case 'theme-light': settingsStore.updateSetting('general.theme', 'off'); break
      case 'theme-system': settingsStore.updateSetting('general.theme', 'system'); break
      
      case 'toggle-fullscreen':
        if (isElectron) {
          (window as any).electronAPI?.toggleFullscreen()
        } else {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
          } else {
            document.exitFullscreen()
          }
        }
        break
      
      case 'dev-tools':
        if (isElectron) {
          (window as any).electronAPI?.toggleDevTools()
        }
        break

      case 'exit': 
        if (await ensureSaved()) {
          if (isElectron) {
            (window as any).electronAPI?.forceClose()
          } else {
            window.close()
          }
        }
        break
      case 'open-ai-profiles':
        uiStore.showAIProfileModal = true
        break

      default:
        uiStore.showToast(`handleAction中不存在${id}操作${payload}`, 'warning')
    }
  }

  return {
    handleAction,
    ensureSaved,
    openExternalLink,
    invokeAI
  }
}
