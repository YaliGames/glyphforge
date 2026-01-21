<template>
  <Modal 
    :show="uiStore.confirmState.show" 
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
        <button 
          @click="uiStore.handleConfirm(false)"
          class="px-6 py-2 bg-gray-100 dark:bg-[#37373d] hover:bg-gray-200 dark:hover:bg-[#444444] text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-all"
        >
          {{ uiStore.confirmState.cancelText }}
        </button>
        
        <!-- 新增：第三个可选按钮 -->
        <button 
          v-if="uiStore.confirmState.extraText"
          @click="uiStore.handleConfirm('extra')"
          class="px-6 py-2 border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-sm font-medium transition-all"
        >
          {{ uiStore.confirmState.extraText }}
        </button>

        <button 
          @click="uiStore.handleConfirm(true)"
          class="px-6 py-2 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
          :class="typeClasses.btn"
        >
          {{ uiStore.confirmState.confirmText }}
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '@/store/ui'
import Modal from './Modal.vue'

const uiStore = useUIStore()

const typeClasses = computed(() => {
  switch (uiStore.confirmState.type) {
    case 'warning':
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        icon: 'fa-solid fa-triangle-exclamation text-amber-500',
        btn: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200 dark:shadow-none'
      }
    case 'danger':
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        icon: 'fa-solid fa-circle-exclamation text-red-500',
        btn: 'bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-none'
      }
    case 'success':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        icon: 'fa-solid fa-circle-check text-emerald-500',
        btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none'
      }
    default:
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        icon: 'fa-solid fa-circle-info text-blue-500',
        btn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none'
      }
  }
})
</script>
