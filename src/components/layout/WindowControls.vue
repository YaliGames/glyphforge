<template>
  <div class="flex items-center h-full">
    <!-- 窗口控制按钮组 -->
    <div class="flex items-center h-full">
      <button 
        @click="minimize"
        class="h-10 w-12 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#37373d] transition-colors text-gray-500 dark:text-gray-400" 
        title="最小化"
      >
        <i class="fa-solid fa-minus text-xs"></i>
      </button>
      <button 
        @click="maximize"
        class="h-10 w-12 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#37373d] transition-colors text-gray-500 dark:text-gray-400 group" 
        title="最大化/还原"
      >
        <i class="fa-regular fa-square text-[10px]"></i>
      </button>
      <button 
        @click="close"
        class="h-10 w-12 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors text-gray-500 dark:text-gray-400" 
        title="关闭"
      >
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useActions } from '@/composables/useActions'

const { handleAction } = useActions()

const minimize = () => {
  (window as any).electronAPI?.minimize()
}

const maximize = () => {
  (window as any).electronAPI?.maximize()
}

const close = () => {
  handleAction('exit')
}
</script>
