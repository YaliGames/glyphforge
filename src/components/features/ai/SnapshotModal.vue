<template>
  <Modal 
    title="AI 参考数据预览" 
    @close="$emit('close')" 
    width="max-w-3xl"
  >
    <div class="space-y-6">
      <!-- 注入给 AI 的上下文全量说明 -->
      <div v-if="data && data.__prompt_injection__" class="space-y-2">
        <div class="text-[10px] font-bold text-purple-600 uppercase flex items-center gap-2">
          <i class="fa-solid fa-wand-magic-sparkles text-[8px]"></i>
          Context Injection (Metadata Sent to AI)
        </div>
        <div class="bg-gray-50 dark:bg-[#111] p-4 rounded-xl border dark:border-white/5 text-[11px] whitespace-pre-wrap font-mono leading-relaxed text-gray-600 dark:text-gray-400">
          {{ data.__prompt_injection__ }}
        </div>
      </div>

      <!-- 原始 JSON 数据副本 -->
      <div v-if="data" class="space-y-2">
        <div class="text-[10px] font-bold text-blue-600 uppercase flex items-center gap-2">
          <i class="fa-solid fa-code text-[8px]"></i>
          Raw Data Snapshot (JSON)
        </div>
        <div class="bg-gray-50 dark:bg-[#111] p-4 rounded-xl border dark:border-white/5">
          <pre class="text-[10px] font-mono leading-tight text-gray-500 overflow-x-auto">{{ 
            JSON.stringify(Object.fromEntries(Object.entries(data).filter(([k]) => k !== '__prompt_injection__')), null, 2) 
          }}</pre>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <Button color="purple" @click="$emit('close')">关闭</Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '@/store/ui'
import Modal from '@/components/common/Modal.vue'
import Button from '@/components/common/Button.vue'

defineEmits(['close'])

const uiStore = useUIStore()

const data = computed(() => {
  return uiStore.getModalOptions('ai-snapshot')
})
</script>
