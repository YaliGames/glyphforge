<template>
  <header
    class="h-10 border-b border-divider bg-app-side flex items-center justify-between shrink-0 z-[5000] relative drag-region">
    <div class="flex-1 h-full min-w-0 flex items-center pointer-events-none">
      <div class="flex items-center h-full shrink-0 pointer-events-auto no-drag">
        <div class="flex items-center gap-2 mx-4 cursor-pointer" @click="router.push('/')">
          <img src="/logo.svg" alt="Logo" class="w-6 h-6" />
          <h1 class="font-bold text-sm tracking-tight hidden lg:block dark:text-gray-200">GlyphForge</h1>
        </div>

        <MenuBar :menus="menus" @action="handleMenuAction" class="no-drag" />
      </div>
    </div>

    <!-- 绝对居中的文件名 -->
    <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none max-w-[30%] truncate">
      <span v-if="projectStore.isLoaded" class="text-ui-header select-none">
        {{ displayFileName }}
      </span>
    </div>

    <div class="flex items-center h-full shrink-0 gap-1 pr-2">
      <!-- 撤销/重做快捷按钮 -->
      <div class="flex items-center border-r border-divider pr-2 mr-1 gap-0.5 no-drag">
        <IconButton
          icon="fa-solid fa-rotate-left"
          title="撤销 (Ctrl+Z)"
          size="sm"
          :disabled="!projectStore.canUndo"
          @click="projectStore.undo()"
        />
        <IconButton
          icon="fa-solid fa-rotate-right"
          title="重做 (Ctrl+Y)"
          size="sm"
          :disabled="!projectStore.canRedo"
          @click="projectStore.redo()"
        />
        <IconButton
          v-if="settingsStore.getSettings()['ai.enabled']"
          icon="fa-solid fa-wand-magic-sparkles"
          title="AI 创作助手"
          size="sm"
          :disabled="!projectStore.isLoaded"
          :active="aiStore.isVisible"
          @click="aiStore.toggle()"
          :class="aiStore.isVisible ? '!text-purple-600' : 'hover:!text-purple-600'"
        />
      </div>

      <!-- 窗口控制按钮组 -->
      <WindowControls v-if="isElectron" class="no-drag" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProjectStore } from '@/store/project'
import { useSettingsStore } from '@/store/settings'
import { useAIStore } from '@/store/ai'
import { useUIStore } from '@/store/ui'
import { useActions } from '@/composables/useActions'
import { isElectron } from '@/utils/env'
import IconButton from '@/components/common/IconButton.vue'
import MenuBar from './MenuBar.vue'
import WindowControls from './WindowControls.vue'
import type { AppAction } from '@/types'

const router = useRouter()
const route = useRoute()
const projectStore = useProjectStore()
const settingsStore = useSettingsStore()
const uiStore = useUIStore()
const aiStore = useAIStore()
const { handleAction } = useActions()

const displayFileName = computed(() => {
  const project = projectStore.currentProject
  if (!project) return '未命名项目'
  
  if (project.path) {
    const parts = project.path.split(/[/\\]/);
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.[^/.]+$/, "");
  }
  
  return project.title || '新故事'
})

const canSearch = computed(() => {
  return ['Editor', 'Outline'].includes(route.name as string)
})

interface MenuItem {
  id?: AppAction
  label?: string
  action?: AppAction
  shortcut?: string
  icon?: string
  type?: 'item' | 'separator'
  disabled?: boolean
  children?: MenuItem[]
}

interface Menu {
  id?: string
  label: string
  items: MenuItem[]
}

const menus = computed(() => <Menu[]>[
  {
    id: 'file',
    label: '文件',
    items: [
      { id: 'new-project', label: '新建', shortcut: 'Ctrl+N', icon: '<i class="fa-solid fa-file-circle-plus"></i>' },
      { 
        label: '使用模板新建',
        children: [
          { disabled: true, label: '暂无可用模板' },
          { type: 'separator' },
          { label: '更多...' }
        ]
      },
      { type: 'separator' },
      { id: 'open-project', label: '打开...', shortcut: 'Ctrl+O', icon: '<i class="fa-solid fa-folder-open"></i>' },
      { 
        label: '打开最近项目', 
        icon: '<i class="fa-solid fa-clock-rotate-left"></i>',
        disabled: uiStore.recentFiles.length === 0,
        children: [
          ...(uiStore.recentFiles.slice(0, 10).map(f => ({
            id: `recent-open:${f.path}` as AppAction,
            label: f.path,
          }))),
          { type: 'separator' },
          { label: '更多...' }
        ]
      },
      { type: 'separator' },
      { id: 'import-txt', label: '导入文本...', disabled: !projectStore.isLoaded, icon: '<i class="fa-solid fa-file-import"></i>' },
      { type: 'separator' },
      ...(isElectron ? [
        { id: 'save', label: '保存', shortcut: 'Ctrl+S', disabled: !projectStore.isLoaded, icon: '<i class="fa-solid fa-floppy-disk"></i>' },
        { id: 'save-as', label: '另存为...', shortcut: 'Ctrl+Shift+S', disabled: !projectStore.isLoaded }
      ] : [
        { id: 'save', label: '导出...', shortcut: 'Ctrl+S', disabled: !projectStore.isLoaded, icon: '<i class="fa-solid fa-file-export"></i>' }
      ]),
      { type: 'separator' },
      { id: 'settings', label: '首选项', shortcut: 'Ctrl+,', icon: '<i class="fa-solid fa-gear"></i>' },
      { id: 'exit', label: '退出', shortcut: 'Alt+F4' }
    ]
  },
  {
    id: 'edit',
    label: '编辑',
    items: [
      { id: 'undo', label: '撤销', shortcut: 'Ctrl+Z', icon: '<i class="fa-solid fa-rotate-left"></i>', disabled: !projectStore.canUndo },
      { id: 'redo', label: '重做', shortcut: 'Ctrl+Y', icon: '<i class="fa-solid fa-rotate-right"></i>', disabled: !projectStore.canRedo },
      { type: 'separator' },
      { id: 'find', label: '查找', shortcut: 'Ctrl+F', icon: '<i class="fa-solid fa-magnifying-glass"></i>', disabled: !canSearch.value },
      { id: 'replace', label: '替换', shortcut: 'Ctrl+H', icon: '<i class="fa-solid fa-arrow-right-arrow-left"></i>', disabled: !canSearch.value }
    ]
  },
  {
    id: 'view',
    label: '查看',
    items: [
      { id: 'goto-welcome', label: '开始页' },
      { type: 'separator' },
      { id: 'goto-outline', label: '大纲视图', shortcut: 'Ctrl+1', icon: '<i class="fa-solid fa-map"></i>', disabled: !projectStore.isLoaded },
      { id: 'goto-editor', label: '写作视图', shortcut: 'Ctrl+2', icon: '<i class="fa-solid fa-pen-nib"></i>', disabled: !projectStore.isLoaded },
      { id: 'goto-characters', label: '角色视图', shortcut: 'Ctrl+3', icon: '<i class="fa-solid fa-user-group"></i>', disabled: !projectStore.isLoaded },
      { id: 'goto-worldview', label: '世界观视图', shortcut: 'Ctrl+4', icon: '<i class="fa-solid fa-book-atlas"></i>', disabled: !projectStore.isLoaded },
      { id: 'goto-timeline', label: '时间线视图', shortcut: 'Ctrl+5', icon: '<i class="fa-solid fa-timeline"></i>', disabled: !projectStore.isLoaded },
      { type: 'separator' },
      { id: 'goto-relations', label: '角色关系图谱', icon: '<i class="fa-solid fa-circle-nodes"></i>', disabled: !projectStore.isLoaded },
      { type: 'separator' },
      {
        label: '主题',
        icon: '<i class="fa-solid fa-circle-half-stroke"></i>',
        children: [
          { id: 'theme-light', label: '浅色模式', icon: '<i class="fa-solid fa-sun text-orange-500"></i>' },
          { id: 'theme-dark', label: '深色模式', icon: '<i class="fa-solid fa-moon text-blue-400"></i>' },
          { id: 'theme-system', label: '跟随系统', icon: '<i class="fa-solid fa-desktop text-gray-400"></i>' }
        ]
      },
      { id: 'toggle-fullscreen', label: '全屏', shortcut: 'F11', icon: '<i class="fa-solid fa-expand"></i>' }
    ]
  },
  {
    id: 'help',
    label: '帮助',
    items: [
      ...(isElectron && (import.meta.env.VITE_ENABLE_DEVTOOLS === 'true') ? [
        { id: 'dev-tools', label: '开发人员工具' },
        { id: 'process-explorer', label: '进程资源管理器' },
        { type: 'separator' }
      ] : []),
      { id: 'license', label: '许可证' },
      { id: 'privacy-policy', label: '隐私政策' },
      { type: 'separator' },
      { id: 'check-updates', label: '检查更新' },
      { id: 'report-issue', label: '报告问题' },
      { id: 'build-info', label: '构建信息' },
      { id: 'about', label: '关于', icon: '<i class="fa-solid fa-circle-info"></i>' }
    ]
  }
])

async function handleMenuAction(id: string) {
  if (id.startsWith('recent-open:')) {
    const path = id.replace('recent-open:', '')
    handleAction('open-project', path)
    return
  }
  handleAction(id as AppAction)
}
</script>

<style scoped>
.drag-region {
  -webkit-app-region: drag;
}

.no-drag {
  -webkit-app-region: no-drag;
}
</style>
