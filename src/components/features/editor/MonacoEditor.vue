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

const settingsStore = useSettingsStore()
const emit = defineEmits(['update:modelValue', 'change', 'cursor-change', 'focus', 'blur', 'mounted'])

const editorContainer = ref<HTMLElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null

const handleFind = () => {
  editor?.getAction('actions.find')?.run()
}
const handleReplace = () => {
  editor?.getAction('editor.action.startFindReplaceAction')?.run()
}

onMounted(() => {
  if (editorContainer.value) {
    editor = monaco.editor.create(editorContainer.value, {
      value: props.modelValue,
      language: 'plaintext',
      theme: settingsStore.isDarkMode ? 'vs-dark' : 'vs',
      fontSize: settingsStore.getSettings()['editor.fontSize'] || 16,
      fontFamily: 'Georgia, "Times New Roman", serif',
      lineHeight: (settingsStore.getSettings()['editor.fontSize'] || 16) * (settingsStore.getSettings()['editor.lineHeight'] || 1.8),
      wordWrap: 'on',
      minimap: { enabled: false },
      links: false,
      folding: false,
      // 禁用自动补全
      suggestOnTriggerCharacters: false,
      quickSuggestions: false,
      // 禁用自动高亮相同词
      occurrencesHighlight: "off",
      automaticLayout: true,
      unicodeHighlight: {
        ambiguousCharacters: false,
        invisibleCharacters: false
      },
      ...props.options
    })

    editor.onDidFocusEditorWidget(() => {
      emit('focus')
    })

    editor.onDidBlurEditorWidget(() => {
      emit('blur')
    })

    editor.onDidChangeModelContent(() => {
      const projectStore = useProjectStore()
      // 关键：如果正在恢复中，忽略由 setValue 产生的变更事件
      if (projectStore.isRestoring) return

      // 关键：在同步数据回 Store 之前，确保开启会话并存入“变动前”的快照
      // 这样能解决“逻辑位移还没算，文字先变了”导致的撤销不同步问题
      if (!projectStore.isSessionActive) {
        projectStore.startEditSession()
      }

      const value = editor?.getValue() || ''
      emit('update:modelValue', value)
      emit('change', value)

      // 更新会话倒计时
      projectStore.triggerTextChange()
    })

    editor.onDidChangeCursorPosition((e) => {
      emit('cursor-change', e.position)
    })

    // 禁用 Monaco 原生撤销重做，交由全局 History 系统处理
    const projectStore = useProjectStore()
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {
      projectStore.undo()
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY, () => {
      projectStore.redo()
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () => {
      projectStore.redo()
    })

    emit('mounted', editor)

    window.addEventListener('monaco-find', handleFind)
    window.addEventListener('monaco-replace', handleReplace)
  }
})

onUnmounted(() => {
  window.removeEventListener('monaco-find', handleFind)
  window.removeEventListener('monaco-replace', handleReplace)
  if (editor) {
    editor.dispose()
  }
})

watch(() => settingsStore.isDarkMode, (isDark) => {
  if (editor) {
    monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs')
  }
})

watch(() => [settingsStore.getSettings()['editor.fontSize'], settingsStore.getSettings()['editor.lineHeight']], ([fontSize, lineHeight]) => {
  if (editor) {
    const fs = fontSize || 18
    const lh = fs * (lineHeight || 1.8)
    editor.updateOptions({
      fontSize: fs,
      lineHeight: lh
    })
  }
})

watch(() => props.modelValue, (newValue) => {
  if (editor) {
    const currentVal = editor.getValue()
    const projectStore = useProjectStore()

    if (newValue !== currentVal) {
      if (projectStore.isRestoring) {
        editor.setValue(newValue)
        // 确保在 setValue 后的微任务流结束后释放
        requestAnimationFrame(() => {
          projectStore.finishRestoring()
        })
      } else {
        editor.setValue(newValue)
      }
    } else if (projectStore.isRestoring) {
      // 文本没变，但处于恢复模式（可能是撤销了结构修改），也需要释放锁
      projectStore.finishRestoring()
    }
  }
})

defineExpose({
  getEditor: () => editor
})
</script>
