<template>
  <div class="w-full h-full relative">
    <MonacoEditor
      ref="monacoRef"
      v-model="internalValue"
      @cursor-change="handleCursorChange"
      @mounted="onEditorMounted"
      @focus="projectStore.startEditSession"
      @blur="projectStore.endEditSession"
    />
  </div>
</template>

<script setup lang="ts">
import { watch, computed, onUnmounted } from 'vue'
import * as monaco from 'monaco-editor'
import MonacoEditor from './MonacoEditor.vue'
import { useOutlineStore } from '@/store/outline'
import { useProjectStore } from '@/store/project'
import type { OutlineAct } from '@/types'

const props = defineProps<{
  modelValue: string
  acts: OutlineAct[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
  (e: 'cursor-change', payload: { activeActId: string | null }): void
  (e: 'selection-change', selection: monaco.IRange): void
}>()

const outlineStore = useOutlineStore()
const projectStore = useProjectStore()
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let decorationIds: string[] = []
let contentWidgets: monaco.editor.IContentWidget[] = []
let viewZoneIds: string[] = []
let lastRenderedLayout = ''

const internalValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

function onEditorMounted(e: monaco.editor.IStandaloneCodeEditor) {
  editor = e
  
  // 核心：监听文本变更并驱动 Range 位移
  editor.onDidChangeModelContent((event) => {
    // 如果正在恢复历史记录，跳过 Delta 计算以免产生叠加位移
    if (projectStore.isRestoring) return

    // 历史触发已由底层的 MonacoEditor 在数据同步前处理，此处仅负责逻辑位移计算
    event.changes.forEach(change => {
      // 计算行数变化
      const linesDiff = change.text.split('\n').length - (change.range.endLineNumber - change.range.startLineNumber + 1)
      
      outlineStore.applyLineDelta(
        change.range.startLineNumber,
        change.range.endLineNumber,
        linesDiff
      )
    })
  })

  editor.onDidChangeCursorSelection((e) => {
    emit('selection-change', e.selection)
  })

  updateDecorations()
}

/**
 * 清除并更新内容小部件与 ViewZones（用于显示幕标题并撑开空间）
 * 增加了简单的结构比对，避免在每键输入时都强制重绘 ViewZones
 */
function updateContentWidgets(force = false) {
  if (!editor) return

  const layoutFingerprint = props.acts
    .filter(a => !!a.range)
    .map(a => `${a.id}:${a.range!.startLine}:${a.title}`)
    .join('|')

  if (!force && layoutFingerprint === lastRenderedLayout) return
  lastRenderedLayout = layoutFingerprint

  // 移除旧的小部件和 ViewZones
  contentWidgets.forEach(w => editor?.removeContentWidget(w))
  contentWidgets = []
  
  editor.changeViewZones(accessor => {
    viewZoneIds.forEach(id => accessor.removeZone(id))
    viewZoneIds = []

    props.acts.forEach(act => {
      if (act.range && act.range.startLine > 0) {
        // 1. 添加 ViewZone 撑开上方空间
        const zoneId = accessor.addZone({
          afterLineNumber: act.range.startLine - 1,
          heightInPx: 26, 
          domNode: document.createElement('div')
        })
        viewZoneIds.push(zoneId)

        // 2. 添加 ContentWidget 渲染标题
        const widgetId = `act-header-${act.id}`
        const domNode = document.createElement('div')
        domNode.className = 'monaco-act-header-widget'
        domNode.innerHTML = `
          <div class="flex items-center gap-1.5 px-2 py-1 bg-blue-600/90 text-white rounded-t text-[10px] font-bold shadow-md whitespace-nowrap">
            <i class="fa-solid fa-bookmark text-[8px]"></i>
            <span>${act.title || '未命名幕'}</span>
          </div>
        `
        
        const widget: monaco.editor.IContentWidget = {
          getId: () => widgetId,
          getDomNode: () => domNode,
          getPosition: () => ({
            position: { lineNumber: act.range!.startLine, column: 1 },
            preference: [monaco.editor.ContentWidgetPositionPreference.ABOVE]
          })
        }
        
        editor?.addContentWidget(widget)
        contentWidgets.push(widget)
      }
    })
  })
}

/**
 * 核心渲染：将 Act Range 映射为编辑器高亮
 */
function updateDecorations(forceWidgets = false) {
  console.log('Updating act decorations...')
  if (!editor) return
  const model = editor.getModel()
  if (!model) return

  updateContentWidgets(forceWidgets)

  const newDecorations: monaco.editor.IModelDeltaDecoration[] = []

  props.acts.forEach(act => {
    if (act.range && act.range.startLine > 0 && act.range.endLine > 0) {
      const lineCount = model.getLineCount()
      const startLine = Math.min(act.range.startLine, lineCount)
      const endLine = Math.min(act.range.endLine, lineCount)

      newDecorations.push({
        range: new monaco.Range(startLine, 1, endLine, model.getLineMaxColumn(endLine)),
        options: {
          isWholeLine: true,
          className: 'monaco-act-range-highlight',
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        }
      })
    }
  })

  decorationIds = editor.deltaDecorations(decorationIds, newDecorations)
}

/**
 * 监听大纲数据变化，实时刷新视图层
 */
watch(() => props.acts, () => {
  if (projectStore.isRestoring) return

  updateDecorations()
}, { deep: true })

/**
 * 核心修复：监听正文内容变化。
 * 当项目初次加载或切换时，Monaco 会异步填充内容。
 * 此时需要重新计算装饰器位置，避免它们因为模型初始为空而被挤压到第一行。
 */
watch(() => props.modelValue, () => {
  // 延迟一帧，确保 Monaco 已经完成了 setValue 和布局计算
  requestAnimationFrame(() => {
    updateDecorations(true)
  })
}, { immediate: true })

/**
 * 响应历史记录恢复
 */
watch(() => projectStore.isRestoring, (restoring) => {
  if (!restoring) {
    requestAnimationFrame(() => {
      updateDecorations(true)
    })
  }
})

/**
 * 手动辅助：绑定选区至幕
 */
async function bindSelectionToAct(actId: string) {
  if (!editor) return false
  const selection = editor.getSelection()
  if (!selection || selection.isEmpty()) return false

  outlineStore.bindAct(actId, {
    startLine: selection.startLineNumber,
    endLine: selection.endLineNumber
  })
  
  updateDecorations(true)
  return true
}

function handleCursorChange(pos: monaco.IPosition) {
  // 查找光标处于哪一幕
  const activeAct = props.acts.find(a => 
    a.range && pos.lineNumber >= a.range.startLine && pos.lineNumber <= a.range.endLine
  )
  emit('cursor-change', { activeActId: activeAct?.id || null } as any)
}

defineExpose({
  getEditor: () => editor,
  bindSelectionToAct
})

onUnmounted(() => {
  contentWidgets.forEach(w => editor?.removeContentWidget(w))
  editor = null
})
</script>

<style>
.monaco-act-header-widget {
  z-index: 10;
  pointer-events: none;
}

.monaco-act-range-highlight {
  background-color: rgba(59, 130, 246, 0.05);
  border-left: 3px solid #3b82f6;
  margin-left: 1px;
}

.dark .monaco-act-range-highlight {
  background-color: rgba(59, 130, 246, 0.1);
}

/* 行号左侧标记 (如果以后需要) */
.monaco-act-glyph-marker {
  background: #3b82f6 !important;
  width: 4px !important;
  margin-left: 8px;
  border-radius: 2px;
}
</style>
