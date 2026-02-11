<template>
  <button
    :class="[
      'inline-flex items-center justify-center transition-all duration-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95',
      // Size classes
      sizeClasses[size],
      // Color and variant classes
      typeClasses,
      // Rounded
      rounded ? 'rounded-lg' : 'rounded'
    ]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <i v-if="loading" class="fa-solid fa-circle-notch fa-spin mr-2"></i>
    <i v-else-if="icon" :class="[icon, $slots.default ? 'mr-2' : '']"></i>
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  color?: 'blue' | 'purple' | 'red' | 'green' | 'amber' | 'gray'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  outline?: boolean
  text?: boolean
  disabled?: boolean
  loading?: boolean
  icon?: string
  rounded?: boolean
}>(), {
  color: 'blue',
  size: 'md',
  outline: false,
  text: false,
  disabled: false,
  loading: false,
  rounded: true
})

defineEmits(['click'])

const sizeClasses = {
  xs: 'px-2 py-1 text-[10px]',
  sm: 'px-3 py-1.5 text-xs', 
  md: 'px-5 py-2 text-xs',
  lg: 'px-6 py-2.5 text-sm'
}

const typeClasses = computed(() => {
  const c = props.color
  
  // Text only mode
  if (props.text) {
    if (c === 'gray') return 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'
    return `text-${c}-600 hover:text-${c}-700 dark:text-${c}-400 dark:hover:text-${c}-300 hover:bg-${c}-50 dark:hover:bg-${c}-900/20`
  }

  // Outline mode
  if (props.outline) {
    if (c === 'gray') return 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
    return `border border-${c}-200 dark:border-${c}-900/30 text-${c}-600 dark:text-${c}-400 hover:bg-${c}-50 dark:hover:bg-${c}-900/10`
  }

  // Solid mode (Default)
  if (c === 'gray') return 'bg-gray-100 dark:bg-[#333] text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#444]'
  return `bg-${c}-600 hover:bg-${c}-700 text-white shadow-lg shadow-${c}-500/20`
})
</script>
