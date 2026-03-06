<template>
  <Modal title="批量添加" @close="$emit('close')" :close-on-backdrop="false">
    <div class="space-y-6">
      <section class="space-y-3">
        <div>
          <label class="text-ui-label">模板字符串</label>
          <p class="text-[10px] text-gray-500 dark:text-gray-400 mt-2 space-y-1">
            <div>使用以下占位符，系统将自动解析：</div>
            <div class="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1 space-y-1 text-[11px]">
              <div>• <span class="text-purple-600 dark:text-purple-400">{时间}</span> - 事件时间标签</div>
              <div>• <span class="text-purple-600 dark:text-purple-400">{标题}</span> - 事件标题</div>
              <div>• <span class="text-purple-600 dark:text-purple-400">{内容}</span> - 事件描述</div>
            </div>
          </p>
        </div>
        <Input
          v-model="customTemplate"
          placeholder="例如：{时间}：{标题} | {内容}"
          @input="templateError = ''"
        />
        <div v-if="templateError" class="text-[11px] text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
          <i class="fa-solid fa-exclamation-circle mr-1"></i>{{ templateError }}
        </div>
      </section>

      <!-- 数据输入 -->
      <section class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-ui-label">导入文本数据</label>
          <span class="text-ui-detail">每行一条事件</span>
        </div>
        <Input
          v-model="rawText"
          type="textarea"
          :rows="10"
          placeholder="粘贴您的事件数据，每行一条..."
        />
      </section>

      <!-- 预览区 -->
      <section v-if="parsedEvents.length > 0" class="space-y-2">
        <label class="text-ui-label border-b border-divider pb-1 block">预览识别结果 ({{ parsedEvents.length }} 条)</label>
        <div class="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          <div 
            v-for="(ev, idx) in parsedEvents" 
            :key="idx" 
            class="p-2.5 bg-app-hover rounded border border-divider hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <span v-if="ev.timeLabel" class="text-[9px] px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded font-medium">
                    {{ ev.timeLabel }}
                  </span>
                  <span class="text-xs font-bold text-gray-800 dark:text-gray-100">{{ ev.title }}</span>
                </div>
                <p v-if="ev.description" class="text-[10px] text-gray-500 dark:text-gray-400">{{ ev.description }}</p>
              </div>
              <i class="fa-solid fa-check text-green-500 text-xs opacity-70 flex-shrink-0 mt-0.5"></i>
            </div>
          </div>
        </div>
      </section>
      
      <EmptyState 
        v-else-if="rawText.trim()"
        icon="fa-filter-circle-xmark"
        title="未能识别任何事件"
        subtitle="请检查格式是否正确或参考上方说明"
        size="sm"
      />
    </div>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <Button text color="gray" @click="$emit('close')">取消</Button>
        <Button 
          color="blue" 
          :disabled="parsedEvents.length === 0" 
          @click="handleImport"
        >
          导入 {{ parsedEvents.length }} 个事件
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Modal from '@/components/common/Modal.vue'
import Button from '@/components/common/Button.vue'
import Input from '@/components/common/Input.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { TimelineParser } from '@/core/timelineParser'
import { useWorldviewStore } from '@/store/worldview'
import { useUIStore } from '@/store/ui'

const emit = defineEmits(['close'])
const worldviewStore = useWorldviewStore()
const uiStore = useUIStore()

const rawText = ref('')
const customTemplate = ref('{时间}：{标题} | {内容}')
const templateError = ref('')

const parsedEvents = computed(() => {
  if (!rawText.value.trim()) return []
  
  try {
    templateError.value = ''
    
    if (!customTemplate.value.trim()) {
      templateError.value = '请输入模板字符串'
      return []
    }
    
    try {
      const pattern = TimelineParser.createTemplatePattern(customTemplate.value)
      return TimelineParser.parseWithCustomTemplate(rawText.value, pattern)
    } catch (err: any) {
      templateError.value = err.message || '模板格式错误'
      return []
    }
  } catch (err: any) {
    console.error('解析失败:', err)
    return []
  }
})

const handleImport = () => {
  try {
    const finalEvents = parsedEvents.value.map(e => TimelineParser.finalize(e))
    worldviewStore.batchImportTimelineEvents(finalEvents)
    uiStore.showToast(`成功导入 ${finalEvents.length} 个事件`, 'success')
    emit('close')
  } catch (err: any) {
    uiStore.showToast(`导入失败: ${err.message}`, 'error')
  }
}
</script>
