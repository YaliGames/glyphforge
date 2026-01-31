<template>
  <Modal v-if="modelValue" title="编辑关系" @close="close">
    <div class="space-y-4">
      <div class="space-y-1.5">
        <label class="text-[10px] font-bold text-gray-500 uppercase">关系名称</label>
        <input v-model="internalLabel" ref="labelInput"
          class="w-full bg-gray-50 dark:bg-[#252525] border dark:border-[#333] rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all font-bold"
          @keydown.enter="save" />
      </div>

      <div class="space-y-1.5">
        <label class="text-[10px] font-bold text-gray-500 uppercase">备注</label>
        <textarea v-model="internalNotes" rows="3"
          class="w-full bg-gray-50 dark:bg-[#252525] border dark:border-[#333] rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none transition-all"></textarea>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between items-center w-full">
        <Button color="red" text size="xs" icon="fa-solid fa-trash-can" @click="emitDelete">
          删除
        </Button>

        <div class="flex gap-2">
          <Button color="gray" text size="sm" @click="close">取消</Button>
          <Button color="blue" size="sm" @click="save">保存更改</Button>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { Relationship } from '@/types'
import Modal from '@/components/common/Modal.vue'
import Button from '@/components/common/Button.vue'

const props = defineProps<{
  modelValue: boolean
  relationship: Relationship | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'save', updates: Partial<Relationship>): void
  (e: 'delete'): void
}>()

const internalLabel = ref('')
const internalNotes = ref('')
const labelInput = ref<HTMLInputElement | null>(null)

watch(() => props.relationship, (newVal) => {
  if (newVal) {
    internalLabel.value = newVal.label || newVal.type || ''
    internalNotes.value = newVal.notes || ''

    // Auto focus
    if (props.modelValue) {
      nextTick(() => labelInput.value?.focus())
    }
  }
}, { immediate: true })

watch(() => props.modelValue, (val) => {
  if (val && props.relationship) {
    internalLabel.value = props.relationship.label || props.relationship.type || ''
    internalNotes.value = props.relationship.notes || ''
    nextTick(() => labelInput.value?.focus())
  }
})

const close = () => emit('update:modelValue', false)

const save = () => {
  emit('save', {
    label: internalLabel.value,
    notes: internalNotes.value
  })
  close()
}

const emitDelete = () => {
  emit('delete')
  close()
}
</script>