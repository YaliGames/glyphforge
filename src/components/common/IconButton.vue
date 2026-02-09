<template>
  <button
    v-bind="$attrs"
    :title="title"
    :class="[
      'inline-flex items-center justify-center transition-all duration-200 rounded shrink-0',
      'disabled:opacity-30 disabled:cursor-not-allowed',
      sizeClasses[size],
      variantClasses,
      active ? activeClasses : ''
    ]"
    :disabled="disabled"
  >
    <i v-if="icon" :class="[icon, iconSizeClasses[size], iconClass]"></i>
    <slot v-else></slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  icon?: string
  iconClass?: string
  title?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  variant?: 'ghost' | 'filled' | 'primary' | 'danger'
  disabled?: boolean
  active?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'ghost',
  disabled: false,
  active: false
})

const sizeClasses = {
  xs: 'w-5 h-5',
  sm: 'w-8 h-8',
  md: 'w-9 h-9',
  lg: 'w-10 h-10'
}

const iconSizeClasses = {
  xs: 'text-[9px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base'
}

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'text-blue-600 dark:text-blue-400 enabled:hover:bg-blue-50 dark:enabled:hover:bg-blue-900/20'
    case 'danger':
      return 'text-red-500 enabled:hover:bg-red-50 dark:enabled:hover:bg-red-900/20'
    case 'filled':
      return 'bg-gray-100 dark:bg-[#333] text-gray-600 dark:text-gray-400 enabled:hover:bg-gray-200 dark:enabled:hover:bg-[#444]'
    case 'ghost':
    default:
      return 'text-gray-500 dark:text-gray-400 enabled:hover:bg-gray-200 dark:enabled:hover:bg-white/5 enabled:hover:text-gray-700 dark:enabled:hover:text-gray-200'
  }
})

const activeClasses = computed(() => {
  return '!text-blue-600 dark:!text-blue-400 !bg-blue-50 dark:!bg-blue-900/20'
})
</script>
