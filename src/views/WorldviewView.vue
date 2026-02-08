<template>
  <div class="flex-1 flex overflow-hidden bg-white dark:bg-[#1e1e1e]">
    <!-- 左侧目录：仅显示分类 -->
    <SidePanel title="设定维度" width="w-64" side="left">
      <template #actions>
        <button @click="createNewCategory"
          class="p-1.5 hover:bg-gray-200 dark:hover:bg-[#333333] rounded text-blue-600 dark:text-blue-400 transition-colors"
          title="添加新维度">
          <i class="fa-solid fa-plus text-xs"></i>
        </button>
      </template>

      <div class="p-2 space-y-2">
        <div class="relative">
          <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400"></i>
          <input v-model="searchQuery" type="text" placeholder="搜索设定分类..."
            class="w-full bg-white dark:bg-[#2d2d2d] border dark:border-[#333333] rounded-md pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
        </div>

        <nav class="space-y-1" v-if="worldviewStore.worldview">
          <div v-for="cat in filteredCategories" :key="cat.type" @click="activeCategoryType = cat.type" :class="[
            'group p-2 rounded-lg cursor-pointer transition-all duration-200 relative hover:translate-x-0.5 border border-transparent',
            activeCategoryType === cat.type
              ? 'bg-blue-50 dark:bg-[#37373d] text-blue-600 dark:text-blue-400 shadow-sm border-gray-100 dark:border-transparent'
              : 'hover:bg-gray-100 dark:hover:bg-[#2d2d2d] text-gray-600 dark:text-gray-400'
          ]">
            <div class="flex items-center justify-between">
              <div class="flex items-center min-w-0">
                <i :class="getCategoryIcon(cat.type)"
                  class="text-[10px] opacity-70 group-hover:text-blue-500 transition-colors mr-2"></i>
                <span class="text-xs font-bold truncate pr-1">{{ cat.name }}</span>
              </div>
              <div class="flex items-center w-[60px] shrink-0">
                <SidebarActionGroup 
                  :can-move-up="worldviewStore.worldview.categories.indexOf(cat) !== 0"
                  :can-move-down="worldviewStore.worldview.categories.indexOf(cat) !== worldviewStore.worldview.categories.length - 1"
                  @move-up="worldviewStore.moveCategory(cat.type, 'up')"
                  @move-down="worldviewStore.moveCategory(cat.type, 'down')"
                  @delete="confirmRemoveCategory(cat)"
                />
              </div>
            </div>
            <div class="flex items-center justify-between mt-1">
              <span class="text-[9px] text-gray-400 opacity-60 truncate">{{ cat.summary || '暂无摘要' }}</span>
              <span class="text-[9px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1 rounded shrink-0">{{ cat.details.length }}</span>
            </div>
          </div>
        </nav>
      </div>
    </SidePanel>

    <!-- 主要内容区：仅显示当前激活的分类 -->
    <div class="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#1e1e1e] view-transition">
      <div v-if="activeCategory" class="max-w-4xl mx-auto p-8 space-y-12 pb-24">
        <!-- 头部：参考角色面板 -->
        <header class="flex items-center justify-between border-b dark:border-[#333] pb-6">
          <div class="flex items-baseline gap-4">
            <h1 class="text-2xl font-bold dark:text-gray-100 flex items-center">
              <i :class="getCategoryIcon(activeCategory.type)" class="text-blue-500/80 mr-3 text-xl"></i>
              {{ activeCategory.name }}
            </h1>
            <span class="text-xs text-gray-400 font-mono opacity-50 uppercase tracking-wider">{{ activeCategory.type }}</span>
          </div>
          <div v-if="settingsStore.getSettings()['ai.enabled']" class="flex items-center gap-2">
            <AIButton @click="openAIAssistant(activeCategory)" class="!px-3 !py-1.5 shadow-purple-500/20">
              AI 灵感
            </AIButton>
          </div>
        </header>

        <section class="grid grid-cols-1 gap-10 animate-slide-up">
          <!-- 摘要预览：统一样式 -->
          <div class="space-y-4">
            <div class="flex items-center justify-between border-b dark:border-[#333333] pb-2">
              <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <i class="fa-solid fa-align-left text-[10px]"></i>
                核心概述
              </h3>
          </div>
            <textarea v-model="activeCategory.summary" @focus="startEdit()" @blur="endEdit()" rows="3"
              class="w-full bg-white dark:bg-[#1e1e1e] border dark:border-[#333333] rounded-lg px-4 py-3 text-xs leading-relaxed dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
              placeholder="用一句话描述此项的核心设定..."></textarea>
          </div>

          <!-- 详情描述列表 -->
          <div class="space-y-4">
            <div class="flex items-center justify-between border-b dark:border-[#333333] pb-2">
              <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <i class="fa-solid fa-list-check text-[10px]"></i>
                详情条目 (Details)
              </h3>
              <button 
                @click="addDetailItem(activeCategory)"
                class="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
              >
                <i class="fa-solid fa-plus text-[8px]"></i> 添加条目
              </button>
            </div>
            <div class="grid grid-cols-1 gap-4">
              <div v-for="(_, index) in activeCategory.details" :key="index" class="relative group/item">
                <textarea v-model="activeCategory.details[index]" v-auto-resize
                  class="w-full bg-white dark:bg-[#1e1e1e] border dark:border-[#333333] rounded-lg px-4 py-4 text-xs leading-relaxed dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all shadow-sm group-hover/item:border-gray-300 dark:group-hover/item:border-[#444]"
                  placeholder="在此输入详细设定描述..." @focus="startEdit()"
                  @blur="endEdit()"></textarea>
                <button @click="removeDetailItem(activeCategory, index)"
                  class="absolute top-4 right-4 opacity-0 group-hover/item:opacity-100 text-gray-300 hover:text-red-500 transition-all">
                  <i class="fa-solid fa-trash-can text-[10px]"></i>
                </button>
              </div>
              
              <div v-if="activeCategory.details.length === 0"
                class="py-16 text-center border-2 border-dashed dark:border-[#333] rounded-xl flex flex-col items-center gap-3 text-gray-400">
                <i class="fa-solid fa-feather-pointed text-2xl opacity-10"></i>
                <p class="text-[11px]">点击右上角“添加条目”开始构建细节</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- 空状态 -->
      <EmptyState
        v-else
        class="h-full"
        icon="fa-book-atlas"
        title="选择或创建设定维度"
        subtitle="地理、政治、魔法、习俗... 每一个维度都是构建宏大叙事的基石。"
      />
    </div>

    <!-- 弹窗组已移至 GlobalModals -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWorldviewStore } from '@/store/worldview'
import { useUIStore } from '@/store/ui'
import { useSettingsStore } from '@/store/settings'
import { useProjectStore } from '@/store/project'
import { useAIStore } from '@/store/ai'
import { useFieldHistory } from '@/composables/useFieldHistory'
import { WORLDVIEW_PRESET_CATEGORIES } from '@/config'
import SidePanel from '@/components/layout/SidePanel.vue'
import AIButton from '@/components/common/AIButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SidebarActionGroup from '@/components/layout/SidebarActionGroup.vue'

const worldviewStore = useWorldviewStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const settingsStore = useSettingsStore()
const aiStore = useAIStore()
const { startEdit, endEdit } = useFieldHistory()

const searchQuery = ref('')

const activeCategoryType = computed({
  get: () => worldviewStore.activeCategoryType,
  set: (val) => worldviewStore.activeCategoryType = val
})

const activeCategory = computed(() => {
  return worldviewStore.worldview?.categories.find(c => c.type === activeCategoryType.value) || null
})

const filteredCategories = computed(() => {
  if (!worldviewStore.worldview) return []
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return worldviewStore.worldview.categories
  return worldviewStore.worldview.categories.filter(cat => 
    cat.name.toLowerCase().includes(query) || 
    cat.summary.toLowerCase().includes(query)
  )
})

onMounted(() => {
  if (!activeCategoryType.value && worldviewStore.worldview?.categories.length) {
    activeCategoryType.value = worldviewStore.worldview.categories[0].type
  }
})

// 根据类型获取图标
function getCategoryIcon(type: string) {
  const preset = WORLDVIEW_PRESET_CATEGORIES.find(p => p.type === type)
  if (preset) return 'fa-solid ' + preset.icon
  return 'fa-solid fa-folder-open'
}

// 自动调整 textarea 高度的指令
const vAutoResize = {
  mounted: (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
    el.addEventListener('input', () => {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    })
  }
}

function openAIAssistant(cat: any) {
  aiStore.show({
    promptId: 'builtin-worldview-design',
    granular: {
      'worldview': [cat.type],
      'timeline': 'all'
      // 'character': 'all'
    },
    input: `正在深化【${cat.name}】相关设定。\n当前摘要：${cat.summary || '暂无'}\n已记录条目：${cat.details.filter((d: string) => d).join('；') || '暂无'}\n请基于这些点，推演三个更具深度的关联细节或可能产生的社会冲突点。`
  })
}

const addDetailItem = (cat: any) => {
  projectStore.takeSnapshot()
  cat.details.push('')
}

const removeDetailItem = (cat: any, index: number) => {
  projectStore.takeSnapshot()
  cat.details.splice(index, 1)
}

async function confirmRemoveCategory(cat: any) {
  const confirmed = await uiStore.showConfirm({
    title: '删除设定维度',
    message: `确定要删除 "${cat.name}" 及其所有条目吗？`,
    confirmText: '确定删除',
    cancelText: '取消',
    type: 'danger'
  })

  if (confirmed) {
    worldviewStore.removeCategory(cat.type)
  }
}

async function createNewCategory() {
  uiStore.openModal('new-category')
}
</script>

<style scoped>
/* 视图特有样式可以在此添加 */
</style>