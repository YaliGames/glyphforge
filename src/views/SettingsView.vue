<template>
  <div class="h-full flex bg-[#f3f3f3] dark:bg-[#1a1a1a] overflow-hidden">
    <!-- 左侧导航 (VS Code Style) -->
    <aside class="w-64 border-r dark:border-[#333] flex flex-col pt-6 pb-12 shrink-0 bg-[#f3f3f3] dark:bg-[#252526]">
      <div class="px-6 mb-4">
        <h2 class="text-sm font-bold dark:text-gray-200 uppercase tracking-widest opacity-60">设置</h2>
      </div>

      <!-- 搜索栏 -->
      <div class="px-3 mb-6">
        <div class="relative">
          <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400"></i>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="搜索设置..."
            class="w-full bg-white dark:bg-[#1e1e1e] border dark:border-[#333] rounded-md pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 transition-all font-medium"
          />
        </div>
      </div>

      <nav class="flex-1 space-y-1 px-3 overflow-y-auto custom-scrollbar">
        <button 
          v-for="section in filteredSchema" 
          :key="section.id"
          @click="scrollToSection(section.id)"
          :class="[
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all',
            activeSectionId === section.id 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
              : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-[#37373d] hover:text-gray-700 dark:hover:text-gray-300'
          ]"
        >
          <i :class="['fa-solid', section.icon, 'w-4']"></i>
          {{ section.label }}
        </button>
      </nav>
    </aside>

    <!-- 右侧滚动内容区 -->
    <main 
      class="flex-1 overflow-y-auto pt-10 pb-24 scroll-smooth bg-white dark:bg-[#1e1e1e]"
      ref="scrollContainer"
      @scroll="handleScroll"
    >
      <div class="max-w-3xl mx-auto px-12 space-y-16">
        <template v-for="section in filteredSchema" :key="section.id">
          <div :id="`section-${section.id}`" class="space-y-6 scroll-mt-10">
            <div class="flex items-center gap-3 border-b dark:border-[#333] pb-3">
              <i :class="['fa-solid', section.icon, 'text-gray-400']"></i>
              <h3 class="text-lg font-bold dark:text-gray-100 uppercase tracking-tight">{{ section.label }}</h3>
            </div>

            <div class="space-y-8 pl-1">
              <template v-for="item in section.items" :key="item.key">
                <div v-if="shouldShow(item)" class="flex items-start justify-between gap-12 group">
                  <div class="flex-1 space-y-1">
                    <div class="text-xs font-bold dark:text-gray-200 flex items-center gap-2">
                      {{ item.label }}
                      <span class="text-[9px] font-mono text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">[{{ item.key }}]</span>
                    </div>
                    <div class="text-[11px] text-gray-500 leading-relaxed">{{ item.description }}</div>
                  </div>

                  <div class="shrink-0 flex items-center min-h-[32px]">
                    <!-- Boolean Toggle -->
                    <label v-if="item.type === 'boolean'" class="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        :checked="settingsStore.getSettings()[item.key]"
                        @change="(e: any) => settingsStore.updateSetting(item.key, e.target.checked)"
                        class="sr-only peer"
                      >
                      <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                    </label>

                    <!-- Number Input -->
                    <input 
                      v-else-if="item.type === 'number'"
                      type="number"
                      :value="settingsStore.getSettings()[item.key]"
                      @input="(e: any) => settingsStore.updateSetting(item.key, Number(e.target.value))"
                      class="w-24 bg-gray-50 dark:bg-[#252526] border dark:border-[#333] rounded px-3 py-1.5 text-xs outline-none focus:border-blue-500 transition-all font-mono"
                    />

                  <!-- Select Input -->
                  <select 
                    v-else-if="item.type === 'select'"
                    :value="settingsStore.getSettings()[item.key]"
                    @change="(e: any) => settingsStore.updateSetting(item.key, e.target.value)"
                    class="bg-gray-50 dark:bg-[#252526] border dark:border-[#333] rounded px-3 py-1.5 text-xs outline-none focus:border-blue-500 transition-all min-w-[120px]"
                  >
                    <option v-for="opt in item.options" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>

                  <!-- AI Profile List Manager (Button Only) -->
                  <div v-else-if="item.type === 'ai-profile-list'" class="flex items-center">
                    <button 
                      @click="showProfileModal = true"
                      class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                      <i class="fa-solid fa-layer-group mr-2"></i>
                      管理模型配置...
                    </button>
                  </div>

                  <!-- String Input -->
                  <input 
                    v-else-if="item.type === 'string'"
                    type="text"
                    :value="settingsStore.getSettings()[item.key]"
                    @input="(e: any) => settingsStore.updateSetting(item.key, e.target.value)"
                    class="w-64 bg-gray-50 dark:bg-[#252526] border dark:border-[#333] rounded px-3 py-1.5 text-xs outline-none focus:border-blue-500 transition-all"
                    placeholder="请输入内容..."
                  />
                </div>
              </div>
            </template>
          </div>
        </div>
        </template>
      </div>
    </main>

    <!-- 模型配置管理弹窗 -->
    <Modal :show="showProfileModal" title="AI 模型配置管理" @close="showProfileModal = false" width="max-w-4xl">
      <div class="flex h-[600px]">
        <!-- 左侧配置文件列表 -->
        <div class="w-64 border-r dark:border-[#333] flex flex-col shrink-0 bg-gray-50/50 dark:bg-[#252526]/30">
          <div class="p-4 border-b dark:border-[#333] flex items-center justify-between">
            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">已保存配置</span>
            <button @click="addProfile" class="text-blue-500 hover:text-blue-600">
              <i class="fa-solid fa-plus-circle text-sm"></i>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            <button 
              v-for="profile in settingsStore.getSettings()['ai.profiles']" 
              :key="profile.id"
              @click="editingProfileId = profile.id"
              :class="[
                'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all group',
                editingProfileId === profile.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#333] hover:text-gray-700 dark:hover:text-gray-300'
              ]"
            >
              <div class="flex items-center gap-2 truncate">
                <i :class="[
                  'fa-solid',
                  profile.provider === 'openai' ? 'fa-bolt' : profile.provider === 'anthropic' ? 'fa-leaf' : 'fa-gear',
                  editingProfileId === profile.id ? 'text-white' : 'text-gray-400'
                ]"></i>
                <span class="truncate">{{ profile.name }}</span>
              </div>
              <i v-if="settingsStore.getSettings()['ai.activeProfileId'] === profile.id" class="fa-solid fa-check text-[10px] opacity-60"></i>
            </button>
          </div>
        </div>

        <!-- 右侧编辑表单 -->
        <div class="flex-1 flex flex-col bg-white dark:bg-[#1e1e1e]">
          <div v-if="currentEditingProfile" class="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
            <!-- 头部状态 -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <h3 class="text-lg font-bold dark:text-gray-100">{{ currentEditingProfile.name }}</h3>
                <span v-if="settingsStore.getSettings()['ai.activeProfileId'] === currentEditingProfile.id" 
                  class="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-bold rounded-full uppercase border border-green-500/20"
                >当前活动</span>
              </div>
              <div class="flex items-center gap-3">
                <button 
                  v-if="settingsStore.getSettings()['ai.activeProfileId'] !== currentEditingProfile.id"
                  @click="settingsStore.updateSetting('ai.activeProfileId', currentEditingProfile.id)"
                  class="px-3 py-1.5 text-[10px] font-bold text-gray-500 hover:text-blue-500 transition-colors"
                >
                  激活此配置
                </button>
                <button 
                  @click="removeProfile(currentEditingProfile.id)"
                  class="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="删除此配置"
                >
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>

            <!-- 模板选择器 -->
            <div class="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl p-4 space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <i class="fa-solid fa-magic-wand-sparkles text-blue-500"></i>
                  <span class="text-xs font-bold text-blue-700 dark:text-blue-400">快速应用模板</span>
                </div>
                <span class="text-[10px] text-blue-600/60 font-medium">选择模板将重置下方服务器配置</span>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <button 
                  v-for="tpl in AI_PROFILE_TEMPLATES" 
                  :key="tpl.id"
                  @click="applyTemplate(tpl.id)"
                  class="px-3 py-2 rounded-lg bg-white dark:bg-black/20 border border-blue-100 dark:border-blue-800/30 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-all text-center truncate shadow-sm active:scale-95"
                >
                  {{ tpl.name }}
                </button>
              </div>
            </div>

            <!-- 表单字段 -->
            <div class="space-y-6">
              <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b dark:border-[#333] pb-2">基础配置</div>
              <div class="grid grid-cols-2 gap-8">
                <div class="space-y-2">
                  <label class="text-[10px] font-bold text-gray-400 uppercase">配置展示名称</label>
                  <input 
                    type="text" 
                    v-model="currentEditingProfile.name"
                    class="w-full bg-gray-50 dark:bg-[#252526] border dark:border-[#333] rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 transition-all font-bold"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-[10px] font-bold text-gray-400 uppercase">接口兼容类型</label>
                  <select 
                    v-model="currentEditingProfile.provider"
                    class="w-full bg-gray-50 dark:bg-[#252526] border dark:border-[#333] rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 transition-all font-bold"
                  >
                    <option value="openai">OpenAI 兼容 (通用)</option>
                    <option value="anthropic">Anthropic (Claude 专用)</option>
                    <option value="custom">完全自定义 (自定义模板)</option>
                  </select>
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-[10px] font-bold text-gray-400 uppercase">API Endpoint (完整请求地址)</label>
                <input 
                  type="text" 
                  v-model="currentEditingProfile.endpoint"
                  placeholder="https://..."
                  class="w-full bg-gray-50 dark:bg-[#252526] border dark:border-[#333] rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 transition-all font-mono"
                />
              </div>

              <div class="grid grid-cols-2 gap-8">
                <div class="space-y-2">
                  <label class="text-[10px] font-bold text-gray-400 uppercase">API Key (密钥/令牌)</label>
                  <input 
                    type="password" 
                    v-model="currentEditingProfile.apiKey"
                    placeholder="sk-..."
                    class="w-full bg-gray-50 dark:bg-[#252526] border dark:border-[#333] rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 transition-all font-mono"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-[10px] font-bold text-gray-400 uppercase">Model Identifier (模型名称)</label>
                  <input 
                    type="text" 
                    v-model="currentEditingProfile.model"
                    placeholder="gpt-4o / deepseek-chat"
                    class="w-full bg-gray-50 dark:bg-[#252526] border dark:border-[#333] rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            <!-- 高级选项 -->
            <div v-if="currentEditingProfile.provider === 'custom' || currentEditingProfile.template || currentEditingProfile.responsePath" class="space-y-6">
              <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b dark:border-[#333] pb-2">自定义数据引擎 (高级)</div>
              <div class="space-y-2">
                <label class="text-[10px] font-bold text-gray-400 uppercase">请求 Payload 模板 (JSON)</label>
                <div class="text-[9px] text-gray-400 mb-2 italic">可用变量: ${model}, ${messages}, ${prompt}</div>
                <textarea 
                  v-model="currentEditingProfile.template"
                  class="w-full h-32 bg-gray-50 dark:bg-[#252526] border dark:border-[#333] rounded-lg px-4 py-2 text-[11px] outline-none focus:border-blue-500 transition-all font-mono custom-scrollbar"
                ></textarea>
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-bold text-gray-400 uppercase">回复提取路径 (JSON Path)</label>
                <input 
                  type="text" 
                  v-model="currentEditingProfile.responsePath"
                  placeholder="choices[0].message.content"
                  class="w-full bg-gray-50 dark:bg-[#252526] border dark:border-[#333] rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 transition-all font-mono"
                />
              </div>
            </div>
          </div>
          <EmptyState
            v-else
            icon="fa-layer-group"
            size="xl"
            :circle="false"
            subtitle="选择左侧的一个配置进行编辑，或添加新配置"
          />
          
          <div class="p-6 border-t dark:border-[#333] bg-gray-50/50 dark:bg-[#252526]/50 flex justify-end">
            <button 
              @click="showProfileModal = false"
              class="px-10 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              完成并保存
            </button>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useSettingsStore } from '@/store/settings'
import { SETTINGS_SCHEMA, AI_PROFILE_TEMPLATES, type SettingItem, type SettingSection, type AIProfile } from '@/config/settings.schema'
import { v4 as uuidv4 } from 'uuid'
import Modal from '@/components/common/Modal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useRoute } from 'vue-router'

const settingsStore = useSettingsStore()
const route = useRoute()

const activeSectionId = ref(SETTINGS_SCHEMA[0].id)
const scrollContainer = ref<HTMLElement | null>(null)
const searchQuery = ref('')
const showProfileModal = ref(false)
const editingProfileId = ref<string | null>(null)

// 模板应用逻辑
function applyTemplate(templateId: string) {
  if (!currentEditingProfile.value) return
  const template = AI_PROFILE_TEMPLATES.find(t => t.id === templateId)
  if (!template) return

  // 保持现有的 ID 和 Name，除非 Name 是默认的
  const updates: Partial<AIProfile> = {
    provider: template.provider as any,
    endpoint: template.endpoint,
    model: template.model,
    template: template.template,
    responsePath: template.responsePath
  }

  // 如果当前名称是默认的或新配置，则更新名称
  if (!currentEditingProfile.value.name || currentEditingProfile.value.name === '新配置') {
    updates.name = template.name
  }

  updateProfile(currentEditingProfile.value.id, updates)
}

// 深度监听模型配置变化并同步到持久化存储
watch(() => settingsStore.getSettings()['ai.profiles'], (newProfiles) => {
  settingsStore.updateSetting('ai.profiles', newProfiles)
}, { deep: true })

// 当前正在编辑的配置文件
const currentEditingProfile = computed(() => {
  if (!editingProfileId.value) return null
  const profiles = settingsStore.getSettings()['ai.profiles'] || []
  return profiles.find((p: AIProfile) => p.id === editingProfileId.value) || null
})

// 初始化时处理路由跳转和选中第一个配置
onMounted(() => {
  // 处理模型配置列表初始化
  const profiles = settingsStore.getSettings()['ai.profiles'] || []
  if (profiles.length > 0) {
    editingProfileId.value = profiles[0].id
  }

  // 处理从其他页面跳转来的 Section 定位
  const section = route.query.section as string
  if (section) {
    setTimeout(() => {
      scrollToSection(section)
    }, 100)
  }
})

// 基础 Schema 的投影，使用 store 中的 dynamicSchema
const filteredSchema = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  // 确保访问的是 store 的响应式属性
  const sourceSchema = (settingsStore.dynamicSchema || []) as SettingSection[]

  if (!query) return sourceSchema

  return sourceSchema.map(section => {
    const filteredItems = section.items.filter(item => 
      item.label.toLowerCase().includes(query) || 
      item.description.toLowerCase().includes(query) ||
      item.key.toLowerCase().includes(query)
    )
    
    if (filteredItems.length > 0) {
      return { ...section, items: [...filteredItems] }
    }
    return null
  }).filter(Boolean) as SettingSection[]
})

function scrollToSection(id: string) {
  activeSectionId.value = id
  const el = document.getElementById(`section-${id}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}

function handleScroll() {
  if (!scrollContainer.value) return
  
  const sourceSchema = settingsStore.dynamicSchema
  const sections = sourceSchema.map((s: SettingSection) => document.getElementById(`section-${s.id}`))
  const containerRect = scrollContainer.value.getBoundingClientRect()
  
  for (let i = sections.length - 1; i >= 0; i--) {
    const el = sections[i]
    if (el) {
      const rect = el.getBoundingClientRect()
      if (rect.top <= containerRect.top + 100) {
        activeSectionId.value = sourceSchema[i].id
        break
      }
    }
  }
}

function shouldShow(item: SettingItem) {
  if (item.hidden) return false
  if (!item.dependsOn) return true
  return settingsStore.getSettings()[item.dependsOn.key] === item.dependsOn.value
}

// AI Profile 管理逻辑
function addProfile() {
  const current = [...settingsStore.getSettings()['ai.profiles'] || []]
  const newId = uuidv4()
  const newProfile: AIProfile = {
    id: newId,
    name: '新配置',
    provider: 'openai',
    apiKey: '',
    endpoint: '',
    model: ''
  }
  settingsStore.updateSetting('ai.profiles', [...current, newProfile])
  editingProfileId.value = newId
}

function updateProfile(id: string, updates: Partial<AIProfile>) {
  const current = [...settingsStore.getSettings()['ai.profiles'] || []]
  const index = current.findIndex(p => p.id === id)
  if (index !== -1) {
    current[index] = { ...current[index], ...updates }
    settingsStore.updateSetting('ai.profiles', current)
  }
}

function removeProfile(id: string) {
  const current = [...settingsStore.getSettings()['ai.profiles'] || []]
  if (current.length <= 1) return // 至少保留一个
  const filtered = current.filter(p => p.id !== id)
  settingsStore.updateSetting('ai.profiles', filtered)
  
  // 如果删除的是当前选中的，重置选中项
  if (settingsStore.getSettings()['ai.activeProfileId'] === id) {
    settingsStore.updateSetting('ai.activeProfileId', filtered[0].id)
  }
}
</script>

<style scoped>
/* 隐藏默认滚动条，使用 custom-scrollbar */
main {
  scrollbar-gutter: stable;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
