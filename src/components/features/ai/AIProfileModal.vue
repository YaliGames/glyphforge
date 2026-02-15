<template>
  <Modal 
    title="AI 模型配置管理" 
    @close="$emit('close')" 
    width="max-w-4xl"
  >
    <div class="flex h-[600px] -m-6">
      <!-- 左侧配置文件列表 -->
      <SidePanel title="模型配置" width="w-64">
        <template #actions>
          <button @click="startCreating" class="text-blue-500 hover:text-blue-600" title="新建配置">
            <i class="fa-solid fa-plus-circle text-sm"></i>
          </button>
        </template>
        
        <div class="p-2 space-y-6">
          <div v-for="profile in settingsStore.getSettings()['ai.profiles']" :key="profile.id">
            <!-- 供应商标题/配置层级 -->
            <div 
              @click="selectProfile(profile.id)"
              class="flex items-center justify-between px-2 py-1.5 mb-1 rounded-lg cursor-pointer transition-colors group"
              :class="editingProfileId === profile.id && isCreating === false ? 'bg-blue-500/5' : 'hover:bg-gray-100 dark:hover:bg-[#333]'"
            >
              <div class="flex items-center gap-2 min-w-0">
                <i :class="[
                  'fa-solid text-xs transition-colors',
                  profile.provider === 'openai' ? 'fa-bolt text-amber-500' : profile.provider === 'anthropic' ? 'fa-leaf text-green-500' : 'fa-gear text-gray-400',
                  editingProfileId === profile.id ? 'scale-110' : ''
                ]"></i>
                <span class="text-[11px] font-black uppercase tracking-wider truncate" :class="editingProfileId === profile.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'">
                  {{ profile.name }}
                </span>
              </div>
              <i class="fa-solid fa-chevron-right text-[8px] text-gray-300 transform transition-transform" :class="editingProfileId === profile.id ? 'rotate-90 text-blue-500' : ''"></i>
            </div>
            
            <!-- 模型子项列表 (带层级连线效果) -->
            <div class="ml-3.5 pl-3 border-l-2 border-gray-100 dark:border-white/5 pt-1 space-y-1">
              <button 
                v-for="model in (profile.models && profile.models.length > 0 ? profile.models.filter(m => m.trim()) : [null])" 
                :key="model || 'none'"
                @click.stop="model ? activateAndEdit(profile.id, model) : selectProfile(profile.id)"
                :class="[
                  'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all relative',
                  model && settingsStore.getSettings()['ai.activeProfileId'] === `${profile.id}:${model}`
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333] hover:text-gray-600 dark:hover:text-gray-300'
                ]"
              >
                <!-- 连线装饰项 -->
                <div class="absolute -left-[14px] top-1/2 -translate-y-1/2 w-2 h-[2px] bg-gray-100 dark:bg-white/5"></div>
                
                <div class="flex items-center gap-2 truncate">
                  <span class="truncate">{{ model || '(未配置模型)' }}</span>
                </div>
                <i v-if="model && settingsStore.getSettings()['ai.activeProfileId'] === `${profile.id}:${model}`" class="fa-solid fa-check-circle text-[10px]"></i>
              </button>
            </div>
          </div>
        </div>
      </SidePanel>

      <!-- 右侧编辑表单 -->
      <div class="flex-1 flex flex-col bg-white dark:bg-[#1e1e1e]">
        <!-- 模板选择视图 (当处于创建模式时) -->
        <div v-if="isCreating" class="flex-1 p-12 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in duration-300">
          <div class="space-y-2">
            <div class="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i class="fa-solid fa-wand-magic-sparkles text-2xl text-blue-500"></i>
            </div>
            <h2 class="text-xl font-bold dark:text-gray-100">选择一个 AI 供应商模板</h2>
            <p class="text-sm text-gray-400 max-w-sm">
              我们将根据你选择的模板自动预设接口地址和模型列表。
              你也可以选择“自定义”来手动配置所有参数。
            </p>
          </div>

          <div class="grid grid-cols-2 gap-4 w-full max-w-lg">
            <button 
              v-for="tpl in AI_PROFILE_TEMPLATES" 
              :key="tpl.id"
              @click="createFromTemplate(tpl.id)"
              class="group flex flex-col items-start p-4 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left space-y-2"
            >
              <span class="text-sm font-bold group-hover:text-blue-500 transition-colors">{{ tpl.name }}</span>
              <span class="text-[10px] text-gray-400">预设 {{ tpl.models.length }} 个常用模型</span>
            </button>
            <button 
              @click="createBlankProfile"
              class="group flex flex-col items-start p-4 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl hover:border-gray-400/50 hover:bg-gray-400/5 transition-all text-left space-y-2"
            >
              <span class="text-sm font-bold group-hover:text-gray-200 transition-colors">完全自定义</span>
              <span class="text-[10px] text-gray-400">手动输入所有 API 细节</span>
            </button>
          </div>
          
          <button @click="isCreating = false" class="text-xs text-gray-500 hover:text-gray-700">
            取消创建
          </button>
        </div>

        <div v-else-if="currentEditingProfile" class="flex-1 overflow-y-auto p-8 space-y-8">
          <!-- 头部状态 -->
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold dark:text-gray-100">{{ currentEditingProfile.name }}</h3>
            <div class="flex items-center gap-3">
              <button 
                @click="removeProfile(currentEditingProfile.id)"
                class="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="删除此配置"
              >
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>

          <!-- 表单字段 -->
          <div class="space-y-6">
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b dark:border-[#333] pb-2">基础配置</div>
            <div class="grid grid-cols-2 gap-8">
              <Input 
                v-model="currentEditingProfile.name"
                label="配置展示名称"
              />
              <div class="space-y-2">
                <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">接口兼容类型</label>
                <select 
                  v-model="currentEditingProfile.provider"
                  class="w-full bg-white dark:bg-[#1e1e1e] border dark:border-[#333333] rounded-lg px-4 py-2 text-xs outline-none focus:border-blue-500 transition-all shadow-sm"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
            </div>

            <Input 
              v-model="currentEditingProfile.endpoint"
              label="API Endpoint"
              placeholder="https://api.openai.com/v1/chat/completions"
              icon-prefix="fa-solid fa-link"
            />

            <Input 
              type="password"
              v-model="currentEditingProfile.apiKey"
              label="API Key"
              placeholder="sk-..."
              icon-prefix="fa-solid fa-key"
            />

            <div class="space-y-3">
              <label class="text-[10px] font-bold text-gray-400 uppercase flex items-center justify-between">
                <span>可用模型列表</span>
                <Button size="xs" icon="fa-solid fa-plus text-[8px]" @click="addModel">
                  添加备选模型
                </Button>
              </label>
              
              <div class="space-y-2">
                <div v-for="(_, idx) in currentEditingProfile.models || []" :key="idx" class="flex gap-2">
                  <button 
                    @click="activateAndEdit(currentEditingProfile.id, currentEditingProfile.models[idx])"
                    :disabled="!currentEditingProfile.models[idx]?.trim()"
                    class="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                    :class="settingsStore.getSettings()['ai.activeProfileId'] === `${currentEditingProfile.id}:${currentEditingProfile.models[idx]}`
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'bg-gray-100 dark:bg-white/5 text-gray-300 hover:text-blue-500'"
                    :title="currentEditingProfile.models[idx]?.trim() ? '设为活动模型' : '请先填写模型标识'"
                  >
                    <i class="fa-solid fa-check text-[10px]"></i>
                  </button>
                  <Input 
                    v-model="currentEditingProfile.models[idx]"
                    placeholder="例如: gpt-4o"
                    size="sm"
                    class="flex-1 font-mono"
                  />
                  <button 
                    @click="removeModel(idx)"
                    class="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <i class="fa-solid fa-xmark text-xs"></i>
                  </button>
                </div>

                <div v-if="!currentEditingProfile.models || currentEditingProfile.models.length === 0" class="text-[10px] text-amber-500 flex items-center gap-1 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                  注意：未添加模型的配置将无法被选择。
                </div>
              </div>
            </div>
          </div>

          <!-- 高级选项 -->
          <div v-if="currentEditingProfile.provider === 'custom'" class="space-y-6">
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b dark:border-[#333] pb-2">自定义数据引擎 (高级)</div>
            <Input
              type="textarea"
              v-model="currentEditingProfile.template"
              label="请求 Payload 模板 (JSON)"
              placeholder='{"model": "${model}", "messages": "${messages}"}'
              hint="可用变量: ${model}, ${messages}, ${prompt}"
              :rows="5"
              auto-resize
            />
            <Input 
              v-model="currentEditingProfile.responsePath"
              label="回复提取路径 (JSON Path)"
              placeholder="choices[0].message.content"
              icon-prefix="fa-solid fa-code-branch"
            />
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
      <div class="flex justify-end gap-3">
        <Button text color="gray" @click="$emit('close')">关闭</Button>
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
import Button from '@/components/common/Button.vue'
import Input from '@/components/common/Input.vue'
import SidePanel from '@/components/layout/SidePanel.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const settingsStore = useSettingsStore()
const uiStore = useUIStore()

defineEmits(['close'])

const editingProfileId = ref<string | null>(null)
const isCreating = ref(false)

// 当前正在编辑的配置文件
const currentEditingProfile = computed(() => {
  if (isCreating.value || !editingProfileId.value) return null
  const profiles = settingsStore.getSettings()['ai.profiles'] || []
  return profiles.find((p: AIProfile) => p.id === editingProfileId.value) || null
})

// 深度监听模型配置变化并同步到持久化存储
watch(() => settingsStore.getSettings()['ai.profiles'], (newProfiles) => {
  settingsStore.updateSetting('ai.profiles', newProfiles)
}, { deep: true })

function startCreating() {
  isCreating.value = true
  editingProfileId.value = null
}

function selectProfile(id: string) {
  isCreating.value = false
  editingProfileId.value = id
}

function activateAndEdit(profileId: string, model: string) {
  settingsStore.updateSetting('ai.activeProfileId', `${profileId}:${model}`)
  editingProfileId.value = profileId
}

function createFromTemplate(templateId: string) {
  const template = AI_PROFILE_TEMPLATES.find(t => t.id === templateId)
  if (!template) return

  const newProfile: AIProfile = {
    id: uuidv4(),
    name: template.name,
    provider: template.provider as any,
    apiKey: '',
    endpoint: template.endpoint,
    models: [...template.models],
    template: template.template,
    responsePath: template.responsePath
  }

  saveNewProfile(newProfile)
}

function createBlankProfile() {
  const newProfile: AIProfile = {
    id: uuidv4(),
    name: '新配置',
    provider: 'openai',
    apiKey: '',
    endpoint: '',
    models: [],
    template: '',
    responsePath: 'choices[0].message.content'
  }
  saveNewProfile(newProfile)
}

function saveNewProfile(profile: AIProfile) {
  const current = [...settingsStore.getSettings()['ai.profiles'] || []]
  settingsStore.updateSetting('ai.profiles', [...current, profile])
  editingProfileId.value = profile.id
  isCreating.value = false
}

function addModel() {
  if (!currentEditingProfile.value) return
  if (!currentEditingProfile.value.models) {
    currentEditingProfile.value.models = []
  }
  currentEditingProfile.value.models.push('')
}

function removeModel(idx: number) {
  if (!currentEditingProfile.value || !currentEditingProfile.value.models) return
  currentEditingProfile.value.models.splice(idx, 1)
}

async function removeProfile(id: string) {
  const current = [...settingsStore.getSettings()['ai.profiles'] || []]
  if (current.length <= 1) {
    uiStore.showToast('无法删除最后一个配置', 'warning')
    return
  }
  
  const ok = await uiStore.showConfirm({
    title: '删除配置',
    message: '确定要删除这个 AI 模型配置吗？此操作不可撤销。',
    type: 'danger'
  })

  if (!ok) return

  const filtered = current.filter(p => p.id !== id)
  settingsStore.updateSetting('ai.profiles', filtered)
  
  if (settingsStore.getSettings()['ai.activeProfileId'] === id) {
    settingsStore.updateSetting('ai.activeProfileId', filtered[0].id)
  }
  
  uiStore.showToast('配置已删除', 'info')
}

onMounted(() => {
  const profiles = settingsStore.getSettings()['ai.profiles'] || []
  if (profiles.length > 0 && !editingProfileId.value) {
    editingProfileId.value = profiles[0].id
  }
})
</script>
