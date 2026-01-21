<template>
  <Modal :show="show" title="层级结构配置" @close="$emit('close')">
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
              <td class="px-3 py-2">
                <input 
                  v-model="h.name"
                  class="w-full bg-transparent border-none focus:ring-0 px-0 py-0 text-sm"
                  placeholder="输入此层级的统称"
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
        class="w-full py-2 border border-dashed border-gray-300 dark:border-[#333333] text-gray-400 hover:text-blue-500 hover:border-blue-500 transition-all text-xs rounded"
      >
        <i class="fa-solid fa-plus mr-1"></i> 添加下一级深度
      </button>

      <div class="flex justify-end gap-3 pt-4">
        <button 
          @click="$emit('close')"
          class="px-4 py-2 text-xs text-gray-500 hover:text-gray-700"
        >
          取消
        </button>
        <button 
          @click="save"
          class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-lg"
        >
          保存配置
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Modal from '@/components/common/Modal.vue'
import { useProjectStore } from '@/store/project'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits(['close'])
const projectStore = useProjectStore()

const localHierarchies = ref<any[]>([])

watch(() => props.show, (isShowing) => {
  if (isShowing) {
    const existing = projectStore.bundle?.project.hierarchies || []
    localHierarchies.value = existing.map(h => ({ ...h }))
    if (localHierarchies.value.length === 0) {
      localHierarchies.value = [
        { depth: 0, name: '卷' },
        { depth: 1, name: '章' }
      ]
    }
  }
})

function addHierarchy() {
  const nextDepth = localHierarchies.value.length
  localHierarchies.value.push({ depth: nextDepth, name: '新层级' })
}

function removeHierarchy(index: number) {
  localHierarchies.value.splice(index, 1)
  // 重新对深度排序
  localHierarchies.value.forEach((h, i) => {
    h.depth = i
  })
}

function save() {
  projectStore.updateHierarchies(localHierarchies.value)
  emit('close')
}
</script>
