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

    <!-- 弹窗组 -->
    <Modal :show="showNewCategoryModal" title="添加设定维度" width="max-w-xl" @close="showNewCategoryModal = false">
      <div class="space-y-6">
        <div class="grid grid-cols-2 gap-3">
          <button 
            v-for="preset in availablePresets" 
            :key="preset.type"
            @click="selectedPresetType = preset.type"
            :class="[
              'flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left group',
              selectedPresetType === preset.type 
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' 
                : 'border-gray-100 dark:border-[#333] hover:border-gray-200 dark:hover:border-[#444] bg-white dark:bg-[#1e1e1e]'
            ]"
          >
            <div class="flex items-center gap-3 mb-2">
              <div :class="[
                'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                selectedPresetType === preset.type ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-[#333] text-gray-500'
              ]">
                <i :class="['fa-solid', preset.icon]"></i>
              </div>
              <span class="text-xs font-bold dark:text-gray-200">{{ preset.name }}</span>
            </div>
            <p class="text-[10px] text-gray-400 leading-relaxed">{{ preset.desc }}</p>
          </button>
        </div>
        
        <div v-if="availablePresets.length === 0" class="py-12 text-center text-gray-400">
          <i class="fa-solid fa-check-circle text-2xl mb-3 opacity-20"></i>
          <p class="text-xs">所有预设维度已全部创建</p>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button @click="showNewCategoryModal = false" class="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xs font-medium transition-colors">
            取消
          </button>
          <button 
            @click="confirmCreateCategory"
            :disabled="!selectedPresetType"
            class="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            确认添加
          </button>
        </div>
      </template>
    </Modal>
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
import SidePanel from '@/components/common/SidePanel.vue'
import AIButton from '@/components/common/AIButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SidebarActionGroup from '@/components/common/SidebarActionGroup.vue'
import Modal from '@/components/common/Modal.vue'

const worldviewStore = useWorldviewStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const settingsStore = useSettingsStore()
const aiStore = useAIStore()
const { startEdit, endEdit } = useFieldHistory()

const searchQuery = ref('')
const showNewCategoryModal = ref(false)

// 预设分类定义 (规范 4.1)
const PRESET_CATEGORIES = [
  { type: 'geography', name: '地理环境', icon: 'fa-earth-asia', desc: '地形地貌、气候分布、自然资源' },
  { type: 'politics', name: '势力结构', icon: 'fa-crown', desc: '权力结构、法律条文、外交关系' },
  { type: 'culture', name: '社会习俗', icon: 'fa-masks-theater', desc: '民族传统、节日礼仪、饮食服饰' },
  { type: 'military', name: '军事力量', icon: 'fa-shield-halved', desc: '兵种编制、武器装备、战争艺术' },
  { type: 'religion', name: '宗教信仰', icon: 'fa-hamsa', desc: '教会组织、神话传说、禁忌信条' },
  { type: 'magic', name: '特殊力量', icon: 'fa-wand-sparkles', desc: '超自然能力、魔法等级、技能代价' },
  { type: 'technology', name: '科学技术', icon: 'fa-microchip', desc: '发明创造、能源动力、工业水平' },
  { type: 'economy', name: '经济贸易', icon: 'fa-coins', desc: '货币体系、商业往来、贫富差距' },
  { type: 'history', name: '历史纪元', icon: 'fa-landmark', desc: '重大事件、文明更迭、传说史诗' }
]

// 计算当前尚未创建的预设
const availablePresets = computed(() => {
  if (!worldviewStore.worldview) return []
  const existingTypes = new Set(worldviewStore.worldview.categories.map(c => c.type))
  return PRESET_CATEGORIES.filter(p => !existingTypes.has(p.type))
})

const selectedPresetType = ref<string | null>(null)

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
  const preset = PRESET_CATEGORIES.find(p => p.type === type)
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
      'worldview_categories': [cat.type],
      'worldview_timeline': 'all'
      // 'characters': 'all'
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
  selectedPresetType.value = availablePresets.value[0]?.type || null
  showNewCategoryModal.value = true
}

function confirmCreateCategory() {
  const preset = PRESET_CATEGORIES.find(p => p.type === selectedPresetType.value)
  if (preset) {
    worldviewStore.addCategory(preset.name, preset.type)
    activeCategoryType.value = preset.type
    showNewCategoryModal.value = false
  }
}
</script>

<style scoped>
/* 视图特有样式可以在此添加 */
</style>