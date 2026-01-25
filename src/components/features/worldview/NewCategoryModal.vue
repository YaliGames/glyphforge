<template>
  <Modal 
    title="添加设定维度" 
    width="max-w-xl" 
    @close="$emit('close')"
  >
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
        <Button text color="gray" @click="$emit('close')">取消</Button>
        <Button color="blue" :disabled="!selectedPresetType" @click="confirmCreate">确认添加</Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWorldviewStore } from '@/store/worldview'
import Modal from '@/components/common/Modal.vue'
import Button from '@/components/common/Button.vue'

const emit = defineEmits(['close'])
const worldviewStore = useWorldviewStore()

// 预设分类定义 (副本)
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

const selectedPresetType = ref<string | null>(null)

const availablePresets = computed(() => {
  if (!worldviewStore.worldview) return []
  const existingTypes = new Set(worldviewStore.worldview.categories.map(c => c.type))
  return PRESET_CATEGORIES.filter(p => !existingTypes.has(p.type))
})

function confirmCreate() {
  const preset = PRESET_CATEGORIES.find(p => p.type === selectedPresetType.value)
  if (preset) {
    worldviewStore.addCategory(preset.name, preset.type)
    worldviewStore.activeCategoryType = preset.type
    emit('close')
  }
}

onMounted(() => {
  selectedPresetType.value = availablePresets.value[0]?.type || null
})
</script>
