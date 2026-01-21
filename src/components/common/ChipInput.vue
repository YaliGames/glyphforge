<template>
  <div class="flex flex-wrap gap-2 p-2 min-h-[38px] bg-white dark:bg-[#1e1e1e] border dark:border-[#333333] rounded-lg focus-within:border-blue-500 transition-colors cursor-text" @click="focusInput">
    <div 
      v-for="(chip, index) in modelValue" 
      :key="index"
      class="group flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md text-xs font-medium animate-in fade-in zoom-in duration-200"
    >
      <span>{{ chip }}</span>
      <button 
        @click.stop="removeChip(index)" 
        class="hover:text-red-500 transition-colors"
      >
        <i class="fa-solid fa-xmark text-[10px]"></i>
      </button>
    </div>
    <input
      ref="inputRef"
      v-model="inputValue"
      type="text"
      :placeholder="modelValue.length === 0 ? placeholder : ''"
      class="flex-1 bg-transparent border-none outline-none text-xs min-w-[80px] dark:text-gray-300"
      @keydown.enter.prevent="addChip"
      @keydown.backspace="handleBackspace"
      @blur="addChip"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: string[]
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const inputValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

function focusInput() {
  inputRef.value?.focus()
}

function addChip() {
  const val = inputValue.value.trim()
  if (val && !props.modelValue.includes(val)) {
    emit('update:modelValue', [...props.modelValue, val])
  }
  inputValue.value = ''
}

function removeChip(index: number) {
  const newList = [...props.modelValue]
  newList.splice(index, 1)
  emit('update:modelValue', newList)
}

function handleBackspace() {
  if (inputValue.value === '' && props.modelValue.length > 0) {
    removeChip(props.modelValue.length - 1)
  }
}
</script>
