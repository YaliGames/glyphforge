<template>
  <div ref="editorContainer" class="w-full h-full"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as monaco from 'monaco-editor'
import { useProjectStore } from '@/store/project'
import { useSettingsStore } from '@/store/settings'

const props = defineProps<{
  modelValue: string
  language?: string
  theme?: string
  options?: monaco.editor.IStandaloneEditorConstructionOptions
}>()

const emit = defineEmits(['update:modelValue', 'change', 'cursor-change', 'focus', 'blur', 'mounted'])

const settingsStore = useSettingsStore()
const editorContainer = ref<HTMLElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null

// 编辑器默认配置
const defaultOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  language: 'plaintext',
  fontFamily: 'Georgia, "Times New Roman", serif',
  wordWrap: 'on',
  minimap: { enabled: false },
  links: false,
  folding: false,
  automaticLayout: true,
  colorDecorators: false,
  suggestOnTriggerCharacters: false,
  quickSuggestions: false,
  occurrencesHighlight: "off",
  unicodeHighlight: {
    ambiguousCharacters: false,
    invisibleCharacters: false
  }
}

const handleFind = () => editor?.getAction('actions.find')?.run()
const handleReplace = () => editor?.getAction('editor.action.startFindReplaceAction')?.run()

onMounted(() => {
  if (!editorContainer.value) return

  const { 'editor.fontSize': fs = 16, 'editor.lineHeight': lh = 1.8 } = settingsStore.getSettings()

  editor = monaco.editor.create(editorContainer.value, {
    value: props.modelValue,
    theme: settingsStore.isDarkMode ? 'vs-dark' : 'vs',
    fontSize: fs,
    lineHeight: fs * lh,
    ...defaultOptions,
    ...props.options
  })

  bindEditorEvents()
  bindKeyBindings()
  
  emit('mounted', editor)
  window.addEventListener('monaco-find', handleFind)
  window.addEventListener('monaco-replace', handleReplace)
})

onUnmounted(() => {
  window.removeEventListener('monaco-find', handleFind)
  window.removeEventListener('monaco-replace', handleReplace)
  editor?.dispose()
})

function bindEditorEvents() {
  if (!editor) return

  editor.onDidFocusEditorWidget(() => emit('focus'))
  editor.onDidBlurEditorWidget(() => emit('blur'))

  // 内容变更处理：核心历史记录逻辑
  editor.onDidChangeModelContent((e) => {
    const projectStore = useProjectStore()
    if (projectStore.isRestoring) return

    // 变更前开启会话，确保状态被捕获
    if (!projectStore.isSessionActive) {
      projectStore.startEditSession()
    }

    const value = editor?.getValue() || ''
    emit('update:modelValue', value)
    emit('change', value)

    // 动态调整提交延迟：换行或长文本粘贴视为意群结束，加速提交
    const hasIntentBreak = e.changes.some(c => c.text.includes('\n') || c.text.length > 10)
    const delay = hasIntentBreak ? 200 : 1000

    projectStore.triggerTextChange(delay)
  })

  // 光标移动处理
  editor.onDidChangeCursorPosition((e) => {
    emit('cursor-change', e.position)
    
    // 显式移动光标（非打字引起）视为当前编辑意图中断，立即提交会话
    if (e.reason === monaco.editor.CursorChangeReason.Explicit) {
      useProjectStore().endEditSession()
    }
  })
}

function bindKeyBindings() {
  if (!editor) return
  const projectStore = useProjectStore()
  
  // 接管系统撤销/重做
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => projectStore.undo())
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY, () => projectStore.redo())
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () => projectStore.redo())
}

watch(() => settingsStore.isDarkMode, (isDark) => {
  monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs')
})

watch(() => [settingsStore.getSettings()['editor.fontSize'], settingsStore.getSettings()['editor.lineHeight']], ([fontSize, lineHeight]) => {
  if (!editor) return
  const fs = fontSize || 16
  const lh = fs * (lineHeight || 1.8)
  editor.updateOptions({ fontSize: fs, lineHeight: lh })
})

watch(() => props.modelValue, (newValue) => {
  if (editor && newValue !== editor.getValue()) {
    editor.setValue(newValue)
    // 此时处于 ProjectStore 恢复期，无需手动干预历史状态
  }
})

defineExpose({
  getEditor: () => editor
})
</script>
