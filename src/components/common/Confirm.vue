<template>
  <Modal 
    v-if="uiStore.confirmState.show" 
    :title="uiStore.confirmState.title" 
    @close="uiStore.handleConfirm(false)"
    width="max-w-md"
  >
    <div class="flex gap-4 py-2">
      <div 
        class="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
        :class="typeClasses.bg"
      >
        <i :class="[typeClasses.icon, 'text-xl']"></i>
      </div>
      <div class="flex-1">
        <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {{ uiStore.confirmState.message }}
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <Button 
          color="gray"
          @click="uiStore.handleConfirm(false)"
        >
          {{ uiStore.confirmState.cancelText }}
        </Button>
        
        <Button 
          v-if="uiStore.confirmState.extraText"
          color="blue"
          @click="uiStore.handleConfirm('extra')"
        >
          {{ uiStore.confirmState.extraText }}
        </Button>

        <Button 
          @click="uiStore.handleConfirm(true)"
          :color="typeClasses.color"
        >
          {{ uiStore.confirmState.confirmText }}
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '@/store/ui'
import Modal from './Modal.vue'
import Button from './Button.vue'

const uiStore = useUIStore()

const typeClasses = computed(() => {
  const type = uiStore.confirmState.type
  if (type === 'warning') {
    return {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      icon: 'fa-solid fa-triangle-exclamation text-amber-500',
      color: 'amber' as const
    }
  }
  if (type === 'danger') {
    return {
      bg: 'bg-red-50 dark:bg-red-900/20',
      icon: 'fa-solid fa-circle-exclamation text-red-500',
      color: 'red' as const
    }
  }
  if (type === 'success') {
    return {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      icon: 'fa-solid fa-circle-check text-emerald-500',
      color: 'green' as const
    }
  }
  return {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'fa-solid fa-circle-info text-blue-500',
    color: 'blue' as const
  }
})
</script>
