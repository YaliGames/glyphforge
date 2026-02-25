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
  onForceSync?: (value: string) => void
}>()

const emit = defineEmits(['update:modelValue', 'change', 'cursor-change', 'selection-change', 'focus', 'blur', 'mounted'])

const projectStore = useProjectStore()
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

  editor.onDidFocusEditorWidget(() => {
    emit('focus')
    projectStore.startEditSession()
  })

  editor.onDidBlurEditorWidget(() => {
    if (props.onForceSync) {
      props.onForceSync(editor?.getValue() || '')
    }
    
    emit('blur')
    projectStore.endEditSession()
  })

  editor.onDidChangeModelContent((e) => {
    if (projectStore.isRestoring) return

    const value = editor?.getValue() || ''
    emit('update:modelValue', value)
    emit('change', value)

    const hasIntentBreak = e.changes.some(c => c.text.includes('\n') || c.text.length > 10)
    
    if (hasIntentBreak && props.onForceSync) {
      props.onForceSync(value)
    }
  })

  editor.onDidChangeCursorPosition((e) => {
    emit('cursor-change', e.position)
  })

  editor.onDidChangeCursorSelection((e) => {
    emit('selection-change', e.selection)
  })
}

// 响应全局同步信号 (例如用户点击顶部撤销按钮前)
watch(() => projectStore.syncSignalCounter, () => {
  if (editor && projectStore.isSessionActive) {
    if (props.onForceSync) {
      props.onForceSync(editor.getValue())
    }
  }
})

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
    // 关键修正：如果正在编辑会话中且非恢复模式，则不通过 props 同步回编辑器
    // 这能解决“打字时因 debounce 导致的文本重渲染/光标跳动”问题
    if (projectStore.isSessionActive && !projectStore.isRestoring) return
    
    const position = editor.getPosition()
    editor.setValue(newValue)
    if (position) editor.setPosition(position)
  }
})

defineExpose({
  getEditor: () => editor
})
</script>
