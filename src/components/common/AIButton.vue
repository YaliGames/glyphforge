<template>
  <button 
    @click="$emit('click')"
    class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-purple-500/20 active:scale-95 group/aibtn disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
    :disabled="disabled || loading"
  >
    <i 
      :class="[
        loading ? 'fa-solid fa-spinner animate-spin' : icon,
        'group-hover/aibtn:rotate-12 transition-transform text-[10px]'
      ]"
    ></i>
    <slot>{{ label }}</slot>
  </button>
</template>

<script setup lang="ts">
interface Props {
  label?: string
  icon?: string
  disabled?: boolean
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  label: 'AI 辅助',
  icon: 'fa-solid fa-wand-magic-sparkles',
  disabled: false,
  loading: false
})

defineEmits<{
  (e: 'click'): void
}>()
</script>
