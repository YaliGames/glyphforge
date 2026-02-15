<template>
  <div class="space-y-2 w-full">
    <!-- Label -->
    <label 
      v-if="label" 
      class="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"
    >
      <i v-if="iconPrefix && !isTextarea" :class="iconPrefix" class="opacity-70"></i>
      {{ label }}
    </label>

    <div class="relative group">
      <!-- Icon Prefix (Inside Input) -->
      <div 
        v-if="iconPrefix && !label && !isTextarea" 
        class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
        :class="size === 'sm' ? 'text-[10px]' : 'text-xs'"
      >
        <i :class="iconPrefix"></i>
      </div>

      <!-- Textarea -->
      <textarea
        v-if="isTextarea"
        ref="textareaRef"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :rows="rows"
        :class="[
          'w-full rounded-lg outline-none transition-all',
          sizeClasses,
          variantClasses,
          hoverClasses,
          resizeClass,
          disabled ? 'opacity-50 cursor-not-allowed' : '',
          inputClass
        ]"
        @input="handleInput"
        @focus="$emit('focus')"
        @blur="$emit('blur')"
        @keydown="$emit('keydown', $event)"
      ></textarea>

      <!-- Input -->
      <input
        v-else
        ref="inputRef"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :class="[
          'w-full rounded-lg outline-none transition-all',
          sizeClasses,
          variantClasses,
          iconPaddingClasses,
          hoverClasses,
          disabled ? 'opacity-50 cursor-not-allowed' : '',
          inputClass
        ]"
        @input="handleInput"
        @focus="$emit('focus')"
        @blur="$emit('blur')"
        @keydown="$emit('keydown', $event)"
        @keydown.enter="$emit('enter')"
      />

      <!-- Icon Suffix -->
      <div 
        v-if="iconSuffix && !isTextarea" 
        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        :class="size === 'sm' ? 'text-[10px]' : 'text-xs'"
      >
        <i :class="iconSuffix"></i>
      </div>
    </div>
    
    <!-- Hint/Error -->
    <p v-if="hint && !error" class="text-[10px] text-gray-400 ml-1">{{ hint }}</p>
    <p v-if="error" class="text-[10px] text-red-500 ml-1">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string | number
  type?: 'text' | 'password' | 'number' | 'email' | 'textarea'
  label?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  rows?: number
  autoResize?: boolean
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
  color?: 'blue' | 'purple' | 'red' | 'green' | 'amber' | 'gray'
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost' | 'filled'
  iconPrefix?: string
  iconSuffix?: string
  error?: string
  hint?: string
  inputClass?: string
}>(), {
  type: 'text',
  rows: 3,
  autoResize: false,
  resize: 'none',
  color: 'blue',
  size: 'md',
  variant: 'default',
  inputClass: ''
})

const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'enter', 'keydown', 'input'])

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

defineExpose({
  focus: () => {
    if (isTextarea.value) textareaRef.value?.focus()
    else inputRef.value?.focus()
  },
  el: computed(() => isTextarea.value ? textareaRef.value : inputRef.value)
})

const isTextarea = computed(() => props.type === 'textarea')

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'ghost':
      return 'bg-transparent border-none shadow-none'
    case 'filled':
      return 'bg-gray-50 dark:bg-[#252526] border-transparent focus:bg-white dark:focus:bg-[#1e1e1e]'
    default:
      return 'bg-white dark:bg-[#1e1e1e] border dark:border-[#333333] shadow-sm'
  }
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return isTextarea.value ? 'px-3 py-1.5 text-[10px]' : 'py-1.5 text-[10px]'
    case 'lg':
      return isTextarea.value ? 'px-6 py-4 text-sm' : 'py-3 text-sm'
    default:
      return isTextarea.value ? 'px-4 py-3 text-xs' : 'py-2 text-xs'
  }
})

const iconPaddingClasses = computed(() => {
  if (isTextarea.value) return ''
  const base = props.size === 'sm' ? 'px-3' : 'px-4'
  const hasInInputIcon = props.iconPrefix && !props.label
  return [
    hasInInputIcon ? (props.size === 'sm' ? 'pl-7' : 'pl-8') : base,
    props.iconSuffix ? (props.size === 'sm' ? 'pr-7' : 'pr-8') : base
  ].join(' ')
})

const hoverClasses = computed(() => {
  const colorMap = {
    blue: 'hover:border-blue-400/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10',
    purple: 'hover:border-purple-400/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10',
    red: 'hover:border-red-400/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/10',
    green: 'hover:border-green-400/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/10',
    amber: 'hover:border-amber-400/50 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10',
    gray: 'hover:border-gray-400/50 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/10'
  }
  return colorMap[props.color] || colorMap.blue
})

const resizeClass = computed(() => {
  if (!isTextarea.value) return ''
  return `resize-${props.resize}`
})

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement | HTMLTextAreaElement
  emit('update:modelValue', target.value)
  emit('input', e)
  
  if (props.autoResize && isTextarea.value) {
    resizeTextarea()
  }
}

function resizeTextarea() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

onMounted(() => {
  if (props.autoResize && isTextarea.value) {
    resizeTextarea()
  }
})

watch(() => props.modelValue, () => {
  if (props.autoResize && isTextarea.value) {
    nextTick(resizeTextarea)
  }
})
</script>
