<template>
  <div v-if="uiStore.isLoading" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
    <div class="bg-white dark:bg-[#1e1e1e] p-6 rounded-lg shadow-xl w-80 flex flex-col items-center gap-4">
      <div class="relative w-12 h-12">
        <svg class="animate-spin text-blue-500 w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      
      <div class="space-y-2 text-center w-full">
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ uiStore.loadingMessage || '加载中...' }}</h3>
        <div v-if="uiStore.loadingProgress >= 0" class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <div class="bg-blue-500 h-full transition-all duration-300" :style="{ width: `${uiStore.loadingProgress}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUIStore } from '@/store/ui'
const uiStore = useUIStore()
</script>
