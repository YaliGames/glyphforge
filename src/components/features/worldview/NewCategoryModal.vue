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
            'flex flex-col items-start p-4 rounded-main border-2 transition-all text-left group',
            selectedPresetType === preset.type 
              ? 'border-blue-500 bg-app-active' 
              : 'border-divider hover:bg-app-hover bg-app-main'
          ]"
        >
          <div class="flex items-center gap-3 mb-2">
            <div :class="[
              'w-8 h-8 rounded-main flex items-center justify-center transition-colors',
              selectedPresetType === preset.type ? 'bg-blue-500 text-white' : 'bg-app-hover text-gray-500'
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
import { WORLDVIEW_PRESET_CATEGORIES } from '@/config'
import Modal from '@/components/common/Modal.vue'
import Button from '@/components/common/Button.vue'

const emit = defineEmits(['close'])
const worldviewStore = useWorldviewStore()

const selectedPresetType = ref<string | null>(null)

const availablePresets = computed(() => {
  if (!worldviewStore.worldview) return []
  const existingTypes = new Set(worldviewStore.worldview.categories.map(c => c.type))
  return WORLDVIEW_PRESET_CATEGORIES.filter(p => !existingTypes.has(p.type))
})

function confirmCreate() {
  const preset = WORLDVIEW_PRESET_CATEGORIES.find(p => p.type === selectedPresetType.value)
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
