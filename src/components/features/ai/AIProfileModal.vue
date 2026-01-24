<template>
  <Modal 
    :show="uiStore.isModalOpen('ai-profile')" 
    title="AI 模型配置管理" 
    @close="uiStore.closeModal('ai-profile')" 
    width="max-w-4xl"
  >
    <div class="flex h-[600px] -m-6">
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
          subtitle="选择一个配置进行编辑，或创建一个新配置"
        />
      </div>
    </div>

    <template #footer>
      <div class="px-6 py-4 border-t dark:border-[#333] flex justify-end bg-gray-50/50 dark:bg-[#1a1a1a]/50">
        <button 
          @click="uiStore.closeModal('ai-profile')"
          class="px-5 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          关闭
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useSettingsStore } from '@/store/settings'
import { useUIStore } from '@/store/ui'
import { AI_PROFILE_TEMPLATES, type AIProfile } from '@/config/settings.schema'
import { v4 as uuidv4 } from 'uuid'
import Modal from '@/components/common/Modal.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const settingsStore = useSettingsStore()
const uiStore = useUIStore()

const editingProfileId = ref<string | null>(null)

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

// 模板应用逻辑
function applyTemplate(templateId: string) {
  if (!currentEditingProfile.value) return
  const template = AI_PROFILE_TEMPLATES.find(t => t.id === templateId)
  if (!template) return

  const updates: Partial<AIProfile> = {
    provider: template.provider as any,
    endpoint: template.endpoint,
    model: template.model,
    template: template.template,
    responsePath: template.responsePath
  }

  if (!currentEditingProfile.value.name || currentEditingProfile.value.name === '新配置') {
    updates.name = template.name
  }

  updateProfile(currentEditingProfile.value.id, updates)
}

function addProfile() {
  const current = [...settingsStore.getSettings()['ai.profiles'] || []]
  const newId = uuidv4()
  const newProfile: AIProfile = {
    id: newId,
    name: '新配置',
    provider: 'openai',
    apiKey: '',
    endpoint: '',
    model: '',
    template: '',
    responsePath: 'choices[0].message.content'
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
  if (current.length <= 1) return
  const filtered = current.filter(p => p.id !== id)
  settingsStore.updateSetting('ai.profiles', filtered)
  
  if (settingsStore.getSettings()['ai.activeProfileId'] === id) {
    settingsStore.updateSetting('ai.activeProfileId', filtered[0].id)
  }
}

onMounted(() => {
  const profiles = settingsStore.getSettings()['ai.profiles'] || []
  if (profiles.length > 0 && !editingProfileId.value) {
    editingProfileId.value = profiles[0].id
  }
})
</script>
