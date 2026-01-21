<template>
  <Transition name="modal" appear>
    <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="handleBackdropClick"></div>
      
      <!-- Modal Content -->
      <div 
        class="relative bg-white dark:bg-[#252526] rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col overflow-hidden transition-colors duration-300"
        :class="width || 'max-w-2xl'"
        @click.stop
      >
        <!-- Header -->
        <div class="px-6 py-4 border-b dark:border-[#333333] flex items-center justify-between shrink-0">
          <div class="flex items-center gap-4">
            <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ title }}</h3>
            <slot name="header-extra"></slot>
          </div>
          <button 
            @click="$emit('close')"
            class="p-2 hover:bg-gray-100 dark:hover:bg-[#37373d] rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
        
        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-6 text-gray-700 dark:text-gray-300">
          <slot></slot>
        </div>
        
        <!-- Footer -->
        <div v-if="$slots.footer" class="px-6 py-4 border-t dark:border-[#333333] bg-gray-50 dark:bg-[#2d2d2d] shrink-0">
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useScrollLock, useModalStack } from '@/composables/useModalInteraction'

const props = withDefaults(defineProps<{
  title: string
  width?: string
  closeOnBackdrop?: boolean
}>(), {
  closeOnBackdrop: true
})

const emit = defineEmits(['close'])

const { lock, unlock } = useScrollLock()
const { register, unregister, isTop } = useModalStack()

onMounted(() => {
  lock()
  register()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  unlock()
  unregister()
  window.removeEventListener('keydown', handleKeydown)
})

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isTop()) {
    if (props.closeOnBackdrop !== false) {
      emit('close')
    }
  }
}

const handleBackdropClick = () => {
  if (props.closeOnBackdrop !== false) {
    emit('close')
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
  opacity: 0;
}
</style>
