<template>
  <Modal 
    title="构建信息" 
    @close="$emit('close')" 
  >
    <div class="space-y-4 dark:text-gray-300 p-2 text-sm">
      <div class="grid grid-cols-2 gap-y-3">
        <div class="text-gray-500">应用版本</div><div class="font-mono">{{ APP_CONFIG.version }}</div>
        <div class="text-gray-500">平台</div><div class="font-mono">{{ platform }}</div>
        <div class="text-gray-500">分支</div><div class="font-mono">main</div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { APP_CONFIG } from '@/config/index'
import Modal from '@/components/common/Modal.vue'
import { isElectron } from '@/utils/env'

defineEmits(['close'])

const platform = computed(() => {
  if (!isElectron) return 'Web'
  return (window as any).electronAPI?.platform || 'Electron'
})
</script>
