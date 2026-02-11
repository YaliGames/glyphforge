<template>
  <Modal title="层级结构配置" @close="$emit('close')">
    <div class="space-y-4">
      <p class="text-[11px] text-gray-500 leading-relaxed italic">
        定义项目中章节的层级深度与对应名称。深度越小层级越高（如 0 为顶层）。
      </p>

      <div class="border dark:border-[#333333] rounded overflow-hidden">
        <table class="w-full text-left text-xs">
          <thead class="bg-gray-50 dark:bg-[#2d2d2d] text-gray-400 font-bold uppercase tracking-widest">
            <tr>
              <th class="px-3 py-2 w-16">深度</th>
              <th class="px-3 py-2">显示名称</th>
              <th class="px-3 py-2 w-16 text-center">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y dark:divide-[#333333]">
            <tr v-for="(h, index) in localHierarchies" :key="index" class="bg-white dark:bg-[#1e1e1e]">
              <td class="px-3 py-2 font-mono text-gray-400">{{ index }}</td>
              <td class="px-3 py-1">
                <Input
                  variant="ghost"
                  size="sm"
                  v-model="h.name"
                  placeholder="层级名称"
                  input-class="hover:text-blue-500 transition-colors"
                />
              </td>
              <td class="px-3 py-2 text-center">
                <button 
                  @click="removeHierarchy(index)"
                  class="text-gray-400 hover:text-red-500 transition-colors"
                  :disabled="localHierarchies.length <= 1"
                >
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <button 
        @click="addHierarchy"
        class="w-full py-2 border border-dashed dark:border-[#333333] rounded text-[10px] text-gray-400 hover:text-blue-500 hover:border-blue-500/50 transition-all font-bold uppercase tracking-widest"
      >
        + 添加层级深度
      </button>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <Button text color="gray" @click="$emit('close')">取消</Button>
        <Button color="blue" @click="save">保存配置</Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useProjectStore } from '@/store/project'
import { useUIStore } from '@/store/ui'
import Modal from '@/components/common/Modal.vue'
import Button from '@/components/common/Button.vue'
import Input from '@/components/common/Input.vue'

const emit = defineEmits(['close'])
const projectStore = useProjectStore()
const uiStore = useUIStore()

const localHierarchies = ref([...(projectStore.bundle?.project.hierarchies || [])])

function addHierarchy() {
  localHierarchies.value.push({
    depth: localHierarchies.value.length,
    name: `层级 ${localHierarchies.value.length}`
  })
}

function removeHierarchy(index: number) {
  localHierarchies.value.splice(index, 1)
  // 重新映射深度
  localHierarchies.value.forEach((h, i) => h.depth = i)
}

function save() {
  if (projectStore.bundle) {
    projectStore.takeSnapshot()
    projectStore.bundle.project.hierarchies = localHierarchies.value
    projectStore.markDirty()
  }
  uiStore.showToast('层级配置已更新', 'success')
  emit('close')
}
</script>
