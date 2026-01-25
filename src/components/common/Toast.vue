<template>
  <TransitionGroup 
    name="toast-fade" 
    tag="div" 
    class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] flex flex-col gap-2 items-center pointer-events-none"
  >
    <div 
      v-for="toast in uiStore.toasts" 
      :key="toast.id"
      class="px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-3 pointer-events-auto min-w-[200px] max-w-md border"
      :class="[
        toast.type === 'success' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
        toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
        toast.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' :
        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
      ]"
    >
      <i :class="[
        'fa-solid',
        toast.type === 'success' ? 'fa-circle-check' :
        toast.type === 'error' ? 'fa-circle-xmark' :
        toast.type === 'warning' ? 'fa-triangle-exclamation' :
        'fa-circle-info'
      ]"></i>
      <span class="flex-1">{{ toast.message }}</span>
      <button 
        @click="uiStore.removeToast(toast.id)"
        class="opacity-50 hover:opacity-100 transition-opacity"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  </TransitionGroup>
</template>

<script setup lang="ts">
import { useUIStore } from '@/store/ui'

const uiStore = useUIStore()
</script>

<style scoped>
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}
.toast-fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.toast-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
