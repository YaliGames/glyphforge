<template>
  <Modal title="目录识别规则管理" @close="$emit('close')" :close-on-backdrop="false">
    <div class="space-y-8">
      <!-- 正则模式 -->
      <section>
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-ui-header flex items-center gap-2">
            <i class="fa-solid fa-wand-sparkles text-[10px]"></i>
            正则匹配模式
          </h4>
          <div class="text-ui-detail italic">修改仅对本次会话生效</div>
        </div>
        <div class="space-y-4">
          <div v-for="hierarchy in projectStore.currentProject?.hierarchies" :key="hierarchy.depth" class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-ui-label">{{ hierarchy.name }} (层级 {{ hierarchy.depth }})</span>
              <button @click="addHierarchyPattern(hierarchy.depth)" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-[10px]">+ 添加规则</button>
            </div>
            <!-- 空状态提示 -->
            <div v-if="!chapterStore.recognitionRules.patterns.hierarchies[hierarchy.depth]?.length" class="text-ui-detail py-1">
              暂无识别规则，该层级将被忽略
            </div>
            <div 
              v-for="(_, idx) in (chapterStore.recognitionRules.patterns.hierarchies[hierarchy.depth] || [])" 
              :key="idx" 
              class="flex items-center gap-2"
            >
              <Input
                size="sm"
                placeholder="正则表达式"
                input-class="font-mono"
                :model-value="chapterStore.recognitionRules.patterns.hierarchies[hierarchy.depth][idx]"
                @update:model-value="(val) => updateHierarchyPattern(hierarchy.depth, idx, val as string)"
              />
              <button @click="removeHierarchyPattern(hierarchy.depth, idx)" class="w-8 h-8 flex shrink-0 items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                <i class="fa-solid fa-trash-can text-[10px]"></i>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 结构锚定 -->
      <section class="space-y-4">
        <h4 class="text-ui-header flex items-center gap-2 border-b border-divider pb-2">
          <i class="fa-solid fa-anchor text-[10px]"></i>
          结构锚定
        </h4>
        <div class="grid grid-cols-2 gap-4">
          <Input
            type="number"
            size="sm"
            label="最大标题长度"
            v-model.number="chapterStore.recognitionRules.structuralAnchors.maxLength"
          />
          <div class="flex items-end pb-3">
            <label class="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                v-model="chapterStore.recognitionRules.structuralAnchors.requireEmptyLineAround"
                class="rounded border-divider text-blue-600 focus:ring-blue-500" 
              />
              <span class="text-ui-label group-hover:text-blue-500 transition-colors">要求前后空行</span>
            </label>
          </div>
        </div>
      </section>

      <!-- 否定规则 -->
      <section class="space-y-4">
        <h4 class="text-ui-header flex items-center gap-2 border-b border-divider pb-2">
          <i class="fa-solid fa-filter-circle-xmark text-[10px]"></i>
          否定规则
        </h4>
        <div class="space-y-3">
          <label class="flex items-center gap-2 cursor-pointer group">
            <input 
              type="checkbox" 
              v-model="chapterStore.recognitionRules.negativeRules.enabled"
              class="rounded border-divider text-blue-600 focus:ring-blue-500" 
            />
            <span class="text-ui-label font-bold group-hover:text-blue-500 transition-colors">启用否定规则排除干扰项</span>
          </label>
          <div v-if="chapterStore.recognitionRules.negativeRules.enabled" class="pl-6 space-y-3 border-l-2 border-divider">
            <label class="flex items-center gap-2 cursor-pointer hover:text-blue-500 transition-colors">
              <input 
                type="checkbox" 
                v-model="chapterStore.recognitionRules.negativeRules.excludePunctuationEnd"
                class="rounded border-divider text-blue-600" 
              />
              <span class="text-ui-detail">排除以句号/问号/感叹号结尾的行 (感言/后记除外)</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer hover:text-blue-500 transition-colors">
              <input 
                type="checkbox" 
                v-model="chapterStore.recognitionRules.negativeRules.excludeDialogueStart"
                class="rounded border-divider text-blue-600" 
              />
              <span class="text-ui-detail">排除以引号/括号开头的行 (对话排除)</span>
            </label>
            <div class="flex items-center justify-between px-1">
              <span class="text-ui-detail">单行最大允许标点符号数</span>
              <Input
                type="number"
                size="sm"
                input-class="text-center"
                class="!w-16"
                v-model.number="chapterStore.recognitionRules.negativeRules.maxPunctuationCount"
              />
            </div>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="flex justify-between w-full items-center">
        <div class="text-ui-detail flex items-center gap-1.5">
          <i class="fa-solid fa-circle-exclamation opacity-70"></i>
          重新解析将会重置当前项目的目录树结构
        </div>
        <div class="flex gap-3">
          <Button outline color="blue" @click="chapterStore.resetRecognitionRules()">恢复默认</Button>
          <Button text color="gray" @click="$emit('close')">取消</Button>
          <Button color="blue" @click="handleReparse">应用并重新解析</Button>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '@/components/common/Modal.vue'
import Button from '@/components/common/Button.vue'
import Input from '@/components/common/Input.vue'
import { useChapterStore } from '@/store/chapters'
import { useProjectStore } from '@/store/project'
import { useUIStore } from '@/store/ui'

const chapterStore = useChapterStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()

const emit = defineEmits(['close'])

const addHierarchyPattern = (depth: number) => {
  if (!chapterStore.recognitionRules.patterns.hierarchies[depth]) {
    chapterStore.recognitionRules.patterns.hierarchies[depth] = []
  }
  chapterStore.recognitionRules.patterns.hierarchies[depth].push('')
}

const removeHierarchyPattern = (depth: number, index: number) => {
  chapterStore.recognitionRules.patterns.hierarchies[depth].splice(index, 1)
}

const updateHierarchyPattern = (depth: number, index: number, value: string) => {
  chapterStore.recognitionRules.patterns.hierarchies[depth][index] = value
}

const handleReparse = () => {
  try {
    chapterStore.reparseChapters()
    uiStore.showToast('目录已根据新规则重新生成', 'success')
    emit('close')
  } catch (e: any) {
    console.error('Failed to reparse chapters:', e)
    uiStore.showToast(`解析失败: ${e.message || '正则表达式可能存在语法错误'}`, 'error')
  }
}
</script>
