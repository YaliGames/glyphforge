<template>
  <Modal v-if="modelValue" title="编辑关系" @close="close">
    <div class="space-y-4">
      <Input
        v-model="internalLabel"
        ref="labelInput"
        label="关系名称"
        placeholder="例如：师徒、仇敌..."
        @enter="save"
      />

      <Input
        v-model="internalNotes"
        type="textarea"
        label="备注"
        placeholder="添加一些关于这段关系的详细说明..."
        :rows="3"
        auto-resize
      />
    </div>

    <template #footer>
      <div class="flex justify-between items-center w-full">
        <Button color="red" text icon="fa-solid fa-trash-can" @click="emitDelete">
          删除
        </Button>

        <div class="flex gap-2">
          <Button color="gray" text @click="close">取消</Button>
          <Button color="blue" @click="save">保存更改</Button>
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
import Input from '@/components/common/Input.vue'

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
const labelInput = ref<any>(null)

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