<template>
  <div 
    class="flex-1 flex flex-col bg-gray-50 dark:bg-[#1e1e1e] text-gray-600 dark:text-gray-300 overflow-hidden relative"
    @dragover.prevent="isDragging = true"
    @drop.prevent="handleDrop"
  >
    <!-- Welcome Content -->
    <div class="flex-1 flex flex-col p-8 md:p-12 max-w-6xl mx-auto w-full overflow-hidden">
      <div class="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <h1 class="text-4xl font-light text-gray-900 dark:text-white mb-2">欢迎使用 GlyphForge</h1>
          <p class="text-gray-500 dark:text-gray-400">构建您的文字世界，从逻辑开始</p>
        </div>
        <div class="flex gap-4">
          <button 
            v-if="projectStore.isLoaded"
            @click="router.push('/outline')"
            class="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-all font-medium shadow-lg shadow-emerald-100 dark:shadow-none flex items-center gap-2 group"
          >
            <i class="fa-solid fa-arrow-right-to-bracket group-hover:translate-x-0.5 transition-transform"></i>
            进入项目
          </button>
          <button 
            @click="triggerFileInput"
            class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors font-medium shadow-lg shadow-blue-200 dark:shadow-none"
          >
            打开项目
          </button>
          <button 
            @click="createNewProject"
            class="px-6 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors font-medium text-gray-700 dark:text-gray-300"
          >
            新建项目
          </button>
        </div>
      </div>

      <div class="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-12 min-h-0">
        <!-- Recent Files (Desktop only) -->
        <div v-if="isElectron" class="lg:col-span-2 flex flex-col min-h-0">
          <div class="shrink-0 flex items-center justify-between mb-6">
            <h2 class="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">最近项目</h2>
            <button 
              v-if="uiStore.recentFiles.length > 0"
              @click="clearRecentFiles"
              class="text-[10px] text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
            >
              <i class="fa-solid fa-trash-can"></i>
              清除记录
            </button>
          </div>
          <div v-if="uiStore.recentFiles.length > 0" class="flex-1 overflow-y-auto space-y-1">
            <div 
              v-for="file in uiStore.recentFiles" 
              :key="file.name + file.path"
              class="group flex items-center justify-between p-3 rounded-lg hover:bg-white dark:hover:bg-[#2d2d2d] hover:shadow-sm transition-all cursor-pointer"
              @click="handleRecentClick(file)"
            >
              <div class="flex items-center gap-4">
                <div 
                  class="w-10 h-10 bg-white dark:bg-[#252526] group-hover:bg-gray-100 dark:group-hover:bg-[#37373d] rounded flex items-center justify-center transition-colors border border-gray-100 dark:border-transparent text-blue-500"
                >
                  <i class="fa-solid fa-file-code text-lg"></i>
                </div>
                <div>
                  <div class="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    {{ file.name }}
                    <span class="text-[9px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 rounded">工程</span>
                  </div>
                  <div class="text-[10px] text-gray-400 dark:text-gray-500">{{ formatDate(file.date) }}</div>
                </div>
              </div>
              <div class="text-[10px] text-blue-600 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                点击打开
              </div>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-200 dark:border-[#333333] rounded-xl">
            <p class="text-gray-400 dark:text-gray-600 text-sm">暂无最近打开的项目</p>
          </div>
        </div>

        <!-- Web Guide (Web only) -->
        <div v-else class="lg:col-span-2 flex flex-col min-h-0">
          <div class="shrink-0 flex items-center justify-between mb-6">
            <h2 class="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">启动中心</h2>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                Web 预览版
              </span>
            </div>
          </div>
          
          <div class="flex-1 overflow-y-auto space-y-1">
            <!-- 下载客户端 -->
            <a 
              href="https://github.com/glyphforge/app/releases" 
              target="_blank"
              class="group flex items-center justify-between p-3 rounded-lg hover:bg-white dark:hover:bg-[#2d2d2d] hover:shadow-sm transition-all cursor-pointer"
            >
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 rounded flex items-center justify-center transition-colors text-blue-600 dark:text-blue-400">
                  <i class="fa-solid fa-cloud-arrow-down text-lg"></i>
                </div>
                <div>
                  <div class="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    获取桌面客户端
                    <span class="text-[9px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1 rounded">推荐</span>
                  </div>
                  <div class="text-[10px] text-gray-400 dark:text-gray-500">解锁本地存储、高性能 AI 补全与更强的数据隐私保护</div>
                </div>
              </div>
              <div class="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                下载 <i class="fa-solid fa-chevron-right ml-1"></i>
              </div>
            </a>

            <!-- 官方文档 -->
            <a 
              :href="APP_CONFIG.links.docs" 
              target="_blank"
              class="group flex items-center justify-between p-3 rounded-lg hover:bg-white dark:hover:bg-[#2d2d2d] hover:shadow-sm transition-all cursor-pointer"
            >
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-white dark:bg-[#252526] group-hover:bg-gray-100 dark:group-hover:bg-[#37373d] rounded flex items-center justify-center transition-colors border border-gray-100 dark:border-transparent text-gray-500">
                  <i class="fa-solid fa-book text-lg"></i>
                </div>
                <div>
                  <div class="text-sm font-medium text-gray-700 dark:text-gray-200">查阅官方文档</div>
                  <div class="text-[10px] text-gray-400 dark:text-gray-500">快速学习结构化写作的核心逻辑与 GlyphForge 的高效用法</div>
                </div>
              </div>
              <i class="fa-solid fa-up-right-from_square text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"></i>
            </a>

            <!-- 开发者社区 -->
            <a 
              :href="APP_CONFIG.links.github" 
              target="_blank" 
              class="group flex items-center justify-between p-3 rounded-lg hover:bg-white dark:hover:bg-[#2d2d2d] hover:shadow-sm transition-all cursor-pointer"
            >
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-white dark:bg-[#252526] group-hover:bg-gray-100 dark:group-hover:bg-[#37373d] rounded flex items-center justify-center transition-colors border border-gray-100 dark:border-transparent text-gray-500">
                  <i class="fa-brands fa-github text-lg"></i>
                </div>
                <div>
                  <div class="text-sm font-medium text-gray-700 dark:text-gray-200">GitHub 源代码</div>
                  <div class="text-[10px] text-gray-400 dark:text-gray-500">本项目已开源，欢迎通过 Issue 或 Pull Request 参与建设</div>
                </div>
              </div>
              <i class="fa-solid fa-up-right_from_square text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"></i>
            </a>
          </div>
        </div>

        <!-- Quick Actions / Tips -->
        <div class="space-y-8 overflow-y-auto pr-2">
          <div>
            <h2 class="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-6">快速入门</h2>
            <div class="space-y-4">
              <div class="p-4 bg-white dark:bg-[#252526] rounded-lg border border-gray-100 dark:border-[#333333] shadow-sm dark:shadow-none">
                <h3 class="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">结构化数据</h3>
                <p class="text-xs text-gray-500 dark:text-gray-500 leading-relaxed">GlyphForge 将世界观、时间线等创作要素实体化，方便在写作时随时调用与校验一致性。</p>
              </div>
              <div class="p-4 bg-white dark:bg-[#252526] rounded-lg border border-gray-100 dark:border-[#333333] shadow-sm dark:shadow-none">
                <h3 class="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">角色管理</h3>
                <p class="text-xs text-gray-500 dark:text-gray-500 leading-relaxed">支持角色间关系、叙事阶段等多种辅助要素，帮助构建丰富的故事人物关系。</p>
              </div>
              <div class="p-4 bg-white dark:bg-[#252526] rounded-lg border border-gray-100 dark:border-[#333333] shadow-sm dark:shadow-none">
                <h3 class="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">AI 辅助</h3>
                <p class="text-xs text-gray-500 dark:text-gray-500 leading-relaxed">基于结构化数据，AI 可以更精准地理解上下文，提供更有深度的写作建议。</p>
              </div>
            </div>
          </div>
          
          <div>
            <h2 class="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-6">资源</h2>
            <ul class="space-y-3 text-sm">
              <li><a href="#" class="text-blue-600 dark:text-blue-400 hover:underline transition-colors">快速入门指南</a></li>
              <li><a href="#" class="text-blue-600 dark:text-blue-400 hover:underline transition-colors">获取更多 AI 提示词</a></li>
              <li><a href="#" class="text-blue-600 dark:text-blue-400 hover:underline transition-colors">扩展及插件开发</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Drag Overlay -->
    <div 
      v-if="isDragging"
      class="fixed inset-0 z-50 bg-blue-600/20 backdrop-blur-sm border-4 border-dashed border-blue-500 flex items-center justify-center"
      @dragover.prevent
      @dragleave="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <div class="text-center pointer-events-none">
        <div class="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl animate-bounce">
          <i class="fa-solid fa-file-arrow-up text-3xl"></i>
        </div>
        <p class="text-2xl font-bold text-white">松开以导入文件</p>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="uiStore.isLoading" class="fixed inset-0 z-[60] bg-white/80 dark:bg-[#1e1e1e]/80 backdrop-blur-md flex flex-col items-center justify-center transition-opacity duration-300">
      <div class="relative">
        <div class="w-12 h-12 border-4 border-blue-100 dark:border-blue-900/30 border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin"></div>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-2 h-2 bg-blue-600 dark:bg-blue-500 rounded-full animate-pulse"></div>
        </div>
      </div>
      <p class="mt-4 text-sm font-medium text-gray-600 dark:text-gray-400 animate-pulse">正在处理文本...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/store/project'
import { useUIStore } from '@/store/ui'
import { useChapterStore } from '@/store/chapters'
import { useActions } from '@/composables/useActions'
import { TxtImporter } from '@/core/bridge/txt-importer'
import { APP_CONFIG } from '@/config'
import { isElectron } from '@/utils/env'

const router = useRouter()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const chapterStore = useChapterStore()
const { handleAction, ensureSaved } = useActions()

const isDragging = ref(false)

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString() + ' ' + new Date(timestamp).toLocaleTimeString()
}

async function createNewProject() {
  handleAction('new-project')
}

async function triggerFileInput() {
  handleAction('open-project')
}

async function clearRecentFiles() {
  const confirmed = await uiStore.showConfirm({
    title: '清除历史',
    message: '确定要清除所有最近打开的项目记录吗？项目物理文件不会受影响。',
    confirmText: '清除记录',
    cancelText: '取消',
    type: 'danger'
  })

  if (confirmed) {
    uiStore.clearRecentFiles()
  }
}

async function handleRecentClick(file: any) {
  if (file.path) {
    handleAction('open-project', file.path)
  }
}

async function handleDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (!file) return

  // 检查当前项目是否需要保存
  if (!(await ensureSaved())) return

  if (file.name.endsWith(APP_CONFIG.projectExtension)) {
    if (isElectron && (file as any).path) {
      const success = await projectStore.openProject((file as any).path)
      if (success) {
        router.push('/outline')
        uiStore.showToast('项目已成功加载', 'success')
      }
    } else {
      // Web 端：读取 File 内容
      try {
        const { text } = await TxtImporter.readFile(file)
        const success = await projectStore.loadProjectContent(text)
        if (success) {
          router.push('/outline')
          uiStore.showToast('项目已成功加载', 'success')
        }
      } catch (err) {
        uiStore.showToast('无法读取项目文件', 'error')
      }
    }
  } else if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
    // 自动导入文本
    const confirmed = await uiStore.showConfirm({
      title: '导入为新项目',
      message: `检测到文本文件 "${file.name}"，是否创建一个新项目并导入该文本？`,
      confirmText: '导入',
      cancelText: '取消',
      type: 'info'
    })

    if (confirmed) {
      try {
        const { text } = await TxtImporter.readFile(file)
        projectStore.createProject(file.name.replace(/\.[^/.]+$/, ''))
        // 自动将文本填充到新项目的正文
        chapterStore.manuscriptContent = text
        router.push('/editor')
        uiStore.showToast('文本已成功导入为新项目', 'success')
      } catch (err) {
        uiStore.showToast('导入失败', 'error')
      }
    }
  }
}
</script>

<style scoped>
</style>
