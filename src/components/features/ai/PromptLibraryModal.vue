<template>
  <Modal title="指令模板库管理" @close="$emit('close')" width="max-w-3xl">
    <div class="flex h-[600px] -m-6">
      <!-- 左侧：列表 -->
      <SidePanel title="模板列表" width="w-64">
        <template #actions>
          <button @click="createNew" class="text-blue-500 hover:text-blue-600 transition-colors">
            <i class="fa-solid fa-plus-circle text-sm"></i>
          </button>
        </template>
        
        <div class="p-2 space-y-1">
          <div v-for="p in aiStore.allPrompts" :key="p.id" 
            @click="activePrompt = { ...p }"
            class="p-3 rounded-xl cursor-pointer transition-all border border-transparent group"
            :class="activePrompt?.id === p.id 
              ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800' 
              : 'hover:bg-gray-100 dark:hover:bg-white/5'"
          >
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-1.5 truncate">
                <i v-if="p.id?.startsWith('builtin-')" class="fa-solid fa-shield-halved text-[9px] text-blue-400"></i>
                <span class="text-xs font-bold truncate dark:text-gray-200">{{ p.label }}</span>
              </div>
              <span class="text-[8px] bg-gray-200 dark:bg-black/40 px-1 rounded text-gray-500 uppercase shrink-0">{{ p.category }}</span>
            </div>
            <p class="text-[9px] text-gray-400 line-clamp-1 italic">{{ p.description }}</p>
          </div>
        </div>
      </SidePanel>

      <!-- 右侧：详情编辑器 -->
      <div class="flex-1 flex flex-col bg-white dark:bg-[#1e1e1e]">
        <div v-if="activePrompt" class="flex-1 overflow-y-auto p-6 space-y-6">
          <div v-if="activePrompt.id?.startsWith('builtin-')" class="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-blue-600 dark:text-blue-400 text-[10px]">
            <i class="fa-solid fa-info-circle"></i>
            <span>系统预设指令，仅可查看，无法修改。</span>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">模板名称</label>
              <input v-model="activePrompt.label" placeholder="模板名称" 
                :disabled="activePrompt.id?.startsWith('builtin-')"
                class="w-full bg-gray-50 dark:bg-[#111] border dark:border-[#333] rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 ring-purple-500/30 disabled:opacity-60 disabled:cursor-not-allowed" />
            </div>
            <div class="space-y-2">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">分类</label>
              <select v-model="activePrompt.category"
                :disabled="activePrompt.id?.startsWith('builtin-')"
                class="w-full bg-gray-50 dark:bg-[#111] border dark:border-[#333] rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 ring-purple-500/30 disabled:opacity-60 disabled:cursor-not-allowed">
                <option value="general">通用</option>
                <option value="writing">写作扩写</option>
                <option value="character">角色设计</option>
                <option value="world">世界观设定</option>
                <option value="outline">大纲逻辑</option>
              </select>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">简短描述</label>
            <input v-model="activePrompt.description" placeholder="用于列表展示的描述..." 
              :disabled="activePrompt.id?.startsWith('builtin-')"
              class="w-full bg-gray-50 dark:bg-[#111] border dark:border-[#333] rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 ring-purple-500/30 disabled:opacity-60 disabled:cursor-not-allowed" />
          </div>

          <div class="space-y-2 flex flex-col flex-1 min-h-[300px]">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 flex justify-between">
              Prompt 模板
              <span class="text-[8px] normal-case text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded">使用 [REFERENCES] 和 [USER_INPUT] 占位</span>
            </label>
            <textarea v-model="activePrompt.content" 
              :disabled="activePrompt.id?.startsWith('builtin-')"
              class="flex-1 w-full bg-gray-50 dark:bg-[#111] border dark:border-[#333] rounded-xl px-4 py-3 text-[11px] leading-relaxed font-mono focus:ring-1 ring-purple-500/30 outline-none resize-none disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="控制权完全交给你..."></textarea>
          </div>
        </div>

        <EmptyState
          v-else
          icon="fa-wand-sparkles"
          :circle="false"
          subtitle="选择一个模板进行编辑，或创建一个新模板"
        />

      </div>
    </div>

    <template #footer>
      <div v-if="activePrompt && !activePrompt.id?.startsWith('builtin-')" class="flex justify-end gap-3">
        <Button outline color="red" icon="fa-solid fa-trash-can" @click="remove">删除</Button>
        <Button color="purple" @click="save">保存更改</Button>
      </div>
      <div v-else class="flex justify-end">
        <Button text color="gray" @click="$emit('close')">关闭</Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Modal from '@/components/common/Modal.vue'
import Button from '@/components/common/Button.vue'
import SidePanel from '@/components/layout/SidePanel.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useAIStore } from '@/store/ai'
import { useUIStore } from '@/store/ui'

const emit = defineEmits(['close'])
const aiStore = useAIStore()
const uiStore = useUIStore()

const activePrompt = ref<any>(null)

function createNew() {
  activePrompt.value = {
    id: '',
    label: '新提示词模板',
    description: '简短描述该指令的用途',
    category: 'general',
    content: '指令示例：\n\n[REFERENCES]\n\n用户输入：\n[USER_INPUT]'
  }
}

async function save() {
  if (!activePrompt.value) return
  if (activePrompt.value.id) {
    aiStore.updatePrompt(activePrompt.value.id, activePrompt.value)
  } else {
    const newPrompt = aiStore.addPrompt(activePrompt.value)
    activePrompt.value.id = newPrompt.id
  }
  uiStore.showToast('模板已保存', 'success')
}

async function remove() {
  if (!activePrompt.value?.id) {
    activePrompt.value = null
    return
  }

  const ok = await uiStore.showConfirm({
    title: '删除模板',
    message: '确定要永久删除这个指令模板吗？',
    type: 'danger'
  })

  if (ok) {
    aiStore.deletePrompt(activePrompt.value.id)
    activePrompt.value = null
    uiStore.showToast('模板已删除', 'info')
  }
}

onMounted(() => {
  if (aiStore.allPrompts.length > 0) {
    activePrompt.value = { ...aiStore.allPrompts[0] }
  }
})
</script>
