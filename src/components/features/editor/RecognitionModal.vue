<template>
  <Modal title="目录识别规则管理" @close="$emit('close')" :close-on-backdrop="false">
    <div class="space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
      <!-- 正则模式 -->
      <section>
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <i class="fa-solid fa-wand-sparkles text-[10px]"></i>
            正则匹配模式
          </h4>
          <div class="text-[10px] text-gray-400 italic">修改仅对本次会话生效</div>
        </div>
        <div class="space-y-4">
          <div v-for="(patterns, type) in chapterStore.recognitionRules.patterns" :key="type" class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">{{ getTypeName(type) }}</span>
              <button @click="addPattern(type)" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-[10px]">+ 添加模式</button>
            </div>
            <div v-for="(_, idx) in patterns" :key="idx" class="flex items-center gap-2">
              <input 
                :value="patterns[idx]"
                @input="(e: any) => updatePattern(type as any, idx, e.target.value)"
                class="flex-1 border dark:border-[#333] rounded-lg px-3 py-1.5 text-xs font-mono bg-gray-50 dark:bg-[#1e1e1e] dark:text-gray-200 outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="正则表达式"
              />
              <button @click="removePattern(type as any, idx)" class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                <i class="fa-solid fa-trash-can text-[10px]"></i>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 结构锚定 -->
      <section class="space-y-4">
        <h4 class="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 border-b dark:border-[#333] pb-2">
          <i class="fa-solid fa-anchor text-[10px]"></i>
          结构锚定 (Structural Anchors)
        </h4>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-gray-400 uppercase">最大标题长度</label>
            <input 
              type="number" 
              v-model.number="chapterStore.recognitionRules.structuralAnchors.maxLength"
              class="w-full bg-gray-50 dark:bg-[#1e1e1e] border dark:border-[#333] rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          <div class="flex items-end pb-1">
            <label class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer group">
              <input 
                type="checkbox" 
                v-model="chapterStore.recognitionRules.structuralAnchors.requireEmptyLineAround"
                class="rounded border-gray-300 dark:border-[#444] text-blue-600 focus:ring-blue-500" 
              />
              <span class="group-hover:text-blue-500 transition-colors">要求前后空行</span>
            </label>
          </div>
        </div>
      </section>

      <!-- 否定规则 -->
      <section class="space-y-4">
        <h4 class="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 border-b dark:border-[#333] pb-2">
          <i class="fa-solid fa-filter-circle-xmark text-[10px]"></i>
          否定规则 (Negative Rules)
        </h4>
        <div class="space-y-3">
          <label class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer group">
            <input 
              type="checkbox" 
              v-model="chapterStore.recognitionRules.negativeRules.enabled"
              class="rounded border-gray-300 dark:border-[#444] text-blue-600 focus:ring-blue-500" 
            />
            <span class="font-bold group-hover:text-blue-500 transition-colors">启用否定规则排除干扰项</span>
          </label>
          <div v-if="chapterStore.recognitionRules.negativeRules.enabled" class="pl-6 space-y-3 border-l-2 border-gray-100 dark:border-[#333]">
            <label class="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 cursor-pointer hover:text-blue-500 transition-colors">
              <input 
                type="checkbox" 
                v-model="chapterStore.recognitionRules.negativeRules.excludePunctuationEnd"
                class="rounded border-gray-300 dark:border-[#444] text-blue-600" 
              />
              <span>排除以句号/问号/感叹号结尾的行 (感言/后记除外)</span>
            </label>
            <label class="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 cursor-pointer hover:text-blue-500 transition-colors">
              <input 
                type="checkbox" 
                v-model="chapterStore.recognitionRules.negativeRules.excludeDialogueStart"
                class="rounded border-gray-300 dark:border-[#444] text-blue-600" 
              />
              <span>排除以引号/括号开头的行 (对话排除)</span>
            </label>
            <div class="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 px-1">
              <span>单行最大允许标点符号数</span>
              <input 
                type="number" 
                v-model.number="chapterStore.recognitionRules.negativeRules.maxPunctuationCount"
                class="w-12 bg-gray-50 dark:bg-[#1e1e1e] border dark:border-[#333] rounded px-1.5 py-0.5 text-center text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="flex justify-between w-full items-center">
        <div class="text-[10px] text-gray-400 flex items-center gap-1.5">
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
import { useChapterStore } from '@/store/chapters'
import { useUIStore } from '@/store/ui'

const chapterStore = useChapterStore()
const uiStore = useUIStore()

const emit = defineEmits(['close'])

const getTypeName = (type: string | number | symbol) => {
  switch (type) {
    case 'volume': return '卷级 (Volume)'
    case 'chapter': return '章级 (Chapter)'
    case 'special': return '特殊 (Special)'
    default: return type.toString()
  }
}

const addPattern = (type: string | number | symbol) => {
  (chapterStore.recognitionRules.patterns as any)[type].push('')
}

const removePattern = (type: string, index: number) => {
  (chapterStore.recognitionRules.patterns as any)[type].splice(index, 1)
}

const updatePattern = (type: 'volume' | 'chapter' | 'special', index: number, value: string) => {
  chapterStore.recognitionRules.patterns[type][index] = value
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
