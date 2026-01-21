<template>
  <div class="flex-1 flex overflow-hidden bg-[#f9f9f9] dark:bg-[#1a1a1a]">
    <!-- 左侧：目录树 -->
    <SidePanel title="目录结构" width="w-64" side="left">
      <template #actions>
        <div class="flex items-center gap-1">
          <button v-if="settingsStore.getSettings()['ai.enabled']" @click="showRecognitionModal = true"
            class="p-1.5 hover:bg-gray-200 dark:hover:bg-[#333] rounded text-gray-500 hover:text-blue-500 transition-colors"
            title="自动识别目录">
            <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
          </button>
                  <button 
          @click="showHierarchyEditor = true"
          class="p-1 hover:bg-gray-200 dark:hover:bg-[#333333] rounded text-gray-500"
          title="编辑层级配置"
        >
          <i class="fa-solid fa-sliders text-xs"></i>
        </button>
        <button 
          @click="setSelectionAsChapter" 
          class="p-1 hover:bg-gray-200 dark:hover:bg-[#333333] rounded text-blue-600 dark:text-blue-400"
          title="将当前行设为章节标题"
        >
          <i class="fa-solid fa-plus text-xs"></i>
        </button>
        </div>
      </template>

      <div class="flex-1 overflow-y-auto p-2">
        <ChapterTreeItem 
          v-for="chapter in chapterStore.chapters" 
          :key="chapter.id"
          :node="chapter"
          :depth="0"
          :active-id="activeChapterId"
          @select="handleChapterSelect"
          @remove="confirmRemoveChapter"
        />
        <div v-if="chapterStore.chapters.length === 0" class="py-10 text-center text-[11px] text-gray-400 leading-relaxed px-4">
          正文中尚无章节标记<br />选中一行并点击上方 "+" 号开始
        </div>
      </div>
    </SidePanel>

    <!-- 中间：单文件正文编辑器 (规范 5.1 & 6.2) -->
    <main class="flex-1 flex flex-col relative bg-white dark:bg-[#1e1e1e] min-w-0">
      <div class="flex-1 relative">
        <MonacoEditor
          ref="monacoRef"
          v-model="chapterStore.manuscriptContent"
          @mounted="onEditorMounted"
          @cursor-change="handleCursorChange"
          @focus="projectStore.startEditSession()"
          @blur="projectStore.endEditSession()"
        />
      </div>
    </main>

    <!-- 右侧：属性与大纲参考 (规范 6.3) -->
    <SidePanel title="属性 / 大纲" width="w-80" side="right">
      <div v-if="activeChapter" class="p-5 space-y-6">
        <!-- 章节基本属性 -->
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">章节名称 (Title)</label>
            <input 
              :value="activeChapter.title"
              @input="(e: any) => chapterStore.updateChapter(activeChapter.id, { title: e.target.value })"
              @focus="startEdit()"
              @blur="endEdit()"
              class="w-full bg-white dark:bg-[#1e1e1e] border dark:border-[#333333] rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 shadow-sm"
              placeholder="正文标题行会自动同步至此..."
            />
          </div>

          <!-- 章节标签 (用于判定角色阶段, 规范 2.3.2) -->
          <div class="space-y-2">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <i class="fa-solid fa-tags text-[9px]"></i>
              章节标签 (Phase Tags)
            </label>
            <input 
              :value="activeChapter.tags?.join(', ')"
              @focus="startEdit()"
              @blur="endEdit()"
              @change="(e: any) => chapterStore.updateChapter(activeChapter.id, { tags: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })"
              class="w-full bg-white dark:bg-[#1e1e1e] border dark:border-[#333333] rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 shadow-sm font-mono"
              placeholder="输入标签，用逗号分隔..."
            />
            <p class="text-[9px] text-gray-400 italic">用于自动判定该章节下角色所处的“叙事阶段”</p>
          </div>
          
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-2">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">显示层级</label>
              <div class="w-full bg-gray-50 dark:bg-[#2d2d2d] rounded px-3 py-1.5 text-xs text-gray-500 font-bold border dark:border-[#333333]">
                {{ projectStore.bundle?.project.hierarchies?.find(h => h.depth === activeChapter.depth)?.name || '未定义层级' }}
              </div>
            </div>
            <div class="space-y-2">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">逻辑深度 (Depth)</label>
              <div class="flex items-center gap-2">
                <button 
                  @click="projectStore.takeSnapshot(); chapterStore.updateChapter(activeChapter.id, { depth: Math.max(0, activeChapter.depth - 1) })" 
                  class="p-1 border rounded hover:bg-gray-100 dark:hover:bg-[#333333]"
                  :disabled="activeChapter.depth <= 0"
                >
                  <i class="fa-solid fa-minus text-[10px]"></i>
                </button>
                <span class="text-xs font-mono">{{ activeChapter.depth }}</span>
                <button 
                  @click="projectStore.takeSnapshot(); chapterStore.updateChapter(activeChapter.id, { depth: activeChapter.depth + 1 })" 
                  class="p-1 border rounded hover:bg-gray-100 dark:hover:bg-[#333333]"
                >
                  <i class="fa-solid fa-plus text-[10px]"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="h-[1px] bg-gray-100 dark:bg-[#333333]"></div>

        <!-- 关联参考 -->
        <div class="space-y-4">
          <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">对应大纲情节 (Bound Act)</label>
          <select 
            :value="activeChapter.linkedOutlineActId"
            @change="(e: any) => chapterStore.updateChapter(activeChapter.id, { linkedOutlineActId: e.target.value })"
            class="w-full bg-white dark:bg-[#1e1e1e] border dark:border-[#333333] rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500"
          >
            <option :value="null">未关联</option>
            <option v-for="act in outlineStore.acts" :key="act.id" :value="act.id">
              {{ act.title }}
            </option>
          </select>

          <div v-if="activeChapterAct" class="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30 space-y-2">
            <h4 class="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <i class="fa-solid fa-bullseye text-[10px]"></i>
              逻辑目的
            </h4>
            <p class="text-[11px] text-gray-600 dark:text-gray-400 italic leading-relaxed">
              {{ activeChapterAct.purpose || '尚未定义此幕的写作目的' }}
            </p>
          </div>
        </div>
      </div>
      
      <EmptyState
        v-else
        icon="fa-list-check"
        size="md"
        subtitle="在左侧选择章节，以查看其属性与对应大纲参考"
      />
    </SidePanel>

    <!-- 模态框组 -->
    <HierarchyEditorModal :show="showHierarchyEditor" @close="showHierarchyEditor = false" />
    <!-- <ExportModal :show="showExportModal" @close="showExportModal = false" /> // 不再使用？ -->
    <RecognitionModal :show="showRecognitionModal" @close="showRecognitionModal = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import * as monaco from 'monaco-editor'
import { useChapterStore } from '@/store/chapters'
import { useOutlineStore } from '@/store/outline'
import { v4 as uuidv4 } from 'uuid'
import { useProjectStore } from '@/store/project'
import { useFieldHistory } from '@/composables/useFieldHistory'
import { useUIStore } from '@/store/ui'
import { useSettingsStore } from '@/store/settings'
import SidePanel from '@/components/common/SidePanel.vue'
import ChapterTreeItem from '@/components/features/editor/ChapterTreeItem.vue'
import MonacoEditor from '@/components/features/editor/MonacoEditor.vue'
import HierarchyEditorModal from '@/components/features/editor/HierarchyEditorModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import RecognitionModal from '@/components/editor/RecognitionModal.vue'

const chapterStore = useChapterStore()
const outlineStore = useOutlineStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const settingsStore = useSettingsStore()
const { startEdit, endEdit } = useFieldHistory()

const activeChapterId = ref<string | null>(null)
const showHierarchyEditor = ref(false)
const showRecognitionModal = ref(false)
let editor: monaco.editor.IStandaloneCodeEditor | null = null

// 用于维护章节 ID 与 Monaco 装饰器 ID 的映射
let chapterDecorations = new Map<string, string>() // chapter.id -> decorationId
let activeDecorationIds: string[] = [] // 存储当前编辑器中实际存在的所有装饰器 ID
let isSyncingFromEditor = false // 防止循环更新的锁

const activeChapter = computed(() => {
  return (chapterStore.flattenedChapters as any[]).find(c => c.id === activeChapterId.value) || null
})

const activeChapterAct = computed(() => {
  if (!activeChapter.value?.linkedOutlineActId) return null
  return outlineStore.acts.find(a => a.id === activeChapter.value?.linkedOutlineActId) || null
})

/**
 * 核心逻辑：刷新/初始化编辑器中的锚点装饰器 (Tracked Ranges)
 * 包含基础的“模糊匹配”逻辑，以应对非正常编辑导致的偏移 (规范 5.3)
 */
function refreshDecorations() {
  if (!editor) return
  const model = editor.getModel()
  if (!model) return

  // 如果设置中关闭了高亮，则只清除现有的装饰器而不添加新装饰器
  if (!settingsStore.getSettings()['editor.showChapterHighlight']) {
    activeDecorationIds = editor.deltaDecorations(activeDecorationIds, [])
    chapterDecorations.clear()
    return
  }

  const newDecorations: monaco.editor.IModelDeltaDecoration[] = []
  const currentChapterIds: string[] = []
  const lineCount = model.getLineCount()
  
  chapterStore.flattenedChapters.forEach(chapter => {
    let targetLine = Math.min(Math.max(1, chapter.anchorLineNumber), lineCount)
    const expectedText = chapter.anchorText?.trim()

    // 基础校验与模糊搜索：如果当前行内容不匹配，尝试在附近上下 10 行搜索
    if (expectedText && model.getLineContent(targetLine).trim() !== expectedText) {
      const searchRange = 10
      let foundLine = -1
      
      for (let i = 1; i <= searchRange; i++) {
        // 向上找
        if (targetLine - i >= 1 && model.getLineContent(targetLine - i).trim() === expectedText) {
          foundLine = targetLine - i
          break
        }
        // 向下找
        if (targetLine + i <= lineCount && model.getLineContent(targetLine + i).trim() === expectedText) {
          foundLine = targetLine + i
          break
        }
      }

      if (foundLine !== -1) {
        targetLine = foundLine
        // 更新 Store 以同步修正后的物理位置
        chapterStore.updateChapter(chapter.id, { anchorLineNumber: targetLine })
      }
    }

    newDecorations.push({
      range: new monaco.Range(targetLine, 1, targetLine, model.getLineMaxColumn(targetLine)),
      options: {
        isWholeLine: true,
        className: 'chapter-anchor-highlight',
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
      }
    })
    currentChapterIds.push(chapter.id)
  })

  // 应用新的装饰器
  // 使用 activeDecorationIds 来确保所有旧的装饰器（包括那些逻辑上已删除的）都能被清除
  activeDecorationIds = editor.deltaDecorations(activeDecorationIds, newDecorations)
  
  // 同步更新 ID 映射表，用于后续根据章节 ID 找物理位置
  chapterDecorations.clear()
  activeDecorationIds.forEach((decoId, index) => {
    // 只有在 newDecorations 的索引范围内才有对应的 Chapter ID
    if (index < currentChapterIds.length) {
      chapterDecorations.set(currentChapterIds[index], decoId)
    }
  })
}

/**
 * 实时同步逻辑：从 Monaco 的物理变化同步到 Store
 * 依靠 Tracked Range 自动平移的特性
 */
function syncStoreFromDecorations() {
  if (!editor || isSyncingFromEditor || projectStore.isRestoring) return
  const model = editor.getModel()
  if (!model) return

  isSyncingFromEditor = true
  const toRemoveIds: string[] = []
  let needsForcedRefresh = false

  // 注意：我们需要操作原始数组，因为 computed 可能还未更新
  chapterStore.flattenedChapters.forEach(chapter => {
    const decoId = chapterDecorations.get(chapter.id)
    if (!decoId) return

    const range = model.getDecorationRange(decoId)
    
    // 如果 Range 消失了（行被完全物理删除）
    if (!range || range.isEmpty()) {
      toRemoveIds.push(chapter.id)
      return
    }

    // 解决换行导致多行高亮的问题：如果 Range 跨行了，说明发生了换行，需要强制重绘装饰器
    if (range.startLineNumber !== range.endLineNumber) {
      needsForcedRefresh = true
    }

    const currentLine = range.startLineNumber
    const currentText = model.getLineContent(currentLine).trim()

    // 修改点：如果标题内容为空，不再解除绑定，而是设定占位符 (例如：未命名章)
    let targetTitle = currentText
    if (!currentText) {
      const hierarchies = projectStore.bundle?.project.hierarchies || []
      const h = hierarchies.find(item => item.depth === chapter.depth)
      targetTitle = `未命名${h ? h.name : '章节'}`
    }

    // 仅在真实变化时更新 Store
    if (chapter.anchorLineNumber !== currentLine || chapter.title !== targetTitle) {
      chapterStore.updateChapter(chapter.id, {
        anchorLineNumber: currentLine,
        title: targetTitle,
        anchorText: currentText // 校验文本使用真实内容
      })
    }
  })

  // 批量删除不再存在的章节 (例如：整行被物理删除导致的装饰器塌陷)
  if (toRemoveIds.length > 0) {
    toRemoveIds.forEach(id => {
      chapterStore.removeChapter(id)
      chapterDecorations.delete(id)
    })
    if (activeChapterId.value && toRemoveIds.includes(activeChapterId.value)) {
      activeChapterId.value = null
    }
    // 已经包含 refreshDecorations()
    refreshDecorations()
  } else if (needsForcedRefresh) {
    // 如果没有删除操作但需要纠正多行高亮，也执行刷新
    refreshDecorations()
  }

  isSyncingFromEditor = false
}

function onEditorMounted(e: monaco.editor.IStandaloneCodeEditor) {
  editor = e
  
  // 初始加载时建立锚点
  refreshDecorations()

  // 监听物理内容变化
  e.onDidChangeModelContent(() => {
    // 1. 如果是撤销/重做导致的恢复，我们需要全量重建装饰器
    if (projectStore.isRestoring) {
      nextTick(() => refreshDecorations())
      return
    }
    
    // 2. 正常编辑导致的物理偏移，我们增量同步 Store
    syncStoreFromDecorations()
  })
}

async function confirmRemoveChapter(id: string) {
  const chapter = (chapterStore.flattenedChapters as any[]).find(c => c.id === id)
  const title = chapter?.title || '未命名章节'
  
  const confirmed = await uiStore.showConfirm({
    title: '删除章节',
    message: `确定要删除章节 "${title}" 吗？该操作仅移除目录结构，不会删除正文文字。`,
    confirmText: '确定删除',
    cancelText: '取消',
    type: 'danger'
  })

  if (confirmed) {
    chapterStore.removeChapter(id)
    if (activeChapterId.value === id) activeChapterId.value = null
  }
}

function handleChapterSelect(id: string) {
  activeChapterId.value = id
  const chapter = (chapterStore.flattenedChapters as any[]).find(c => c.id === id)
  if (chapter && editor) {
    editor.revealLineInCenter(chapter.anchorLineNumber)
    editor.setPosition({ lineNumber: chapter.anchorLineNumber, column: 1 })
    editor.focus()
  }
}

function handleCursorChange(position: monaco.IPosition) {
  // 选中的自动高亮逻辑
  const chapters = [...(chapterStore.flattenedChapters as any[])].sort((a, b) => b.anchorLineNumber - a.anchorLineNumber)
  const currentChapter = chapters.find(c => c.anchorLineNumber <= position.lineNumber)
  if (currentChapter && currentChapter.id !== activeChapterId.value) {
    activeChapterId.value = currentChapter.id
  }
}

function setSelectionAsChapter() {
  if (!editor) return
  const selection = editor.getSelection()
  if (!selection) return
  
  const lineNumber = selection.startLineNumber

  // 检查该行是否已经绑定
  const isAlreadyBound = (chapterStore.flattenedChapters as any[]).some(c => c.anchorLineNumber === lineNumber)
  if (isAlreadyBound) {
    uiStore.showToast('该行已绑定为章节标题', 'warning')
    return
  }

  const model = editor.getModel()
  if (!model) return

  const text = model.getLineContent(lineNumber).trim()
  const id = uuidv4()
  
  // 1. 注册元数据 (Structural Track)
  // 获取层级名称作为占位
  let initialTitle = text
  if (!text) {
    const hierarchies = projectStore.bundle?.project.hierarchies || []
    const h = hierarchies.find(item => item.depth === 0) // 新建默认 depth 0
    initialTitle = `未命名${h ? h.name : '章节'}`
  }

  const newChapter = chapterStore.registerChapterMetadata(
    id, 
    initialTitle, 
    lineNumber
  )
  
  if (newChapter) {
    activeChapterId.value = id
    // 2. 立即建立物理锚点 (Tracked Range)
    refreshDecorations()
  }
}

// 监听项目切换，重启装饰器
watch(() => projectStore.bundle?.project.id, () => {
  nextTick(() => refreshDecorations())
})

/**
 * 核心修复：监听正文内容变化。
 * 当项目初次加载或切换时，Monaco 会异步填充内容。
 * 此时需要重新计算装饰器位置，避免它们因为模型初始为空而被挤压到第一行。
 */
watch(() => chapterStore.manuscriptContent, () => {
  // 延迟一帧，确保 Monaco 已经完成了 setValue 和布局计算
  requestAnimationFrame(() => refreshDecorations())
}, { immediate: true })

// 监听章节数量变动（非编辑器同步引起的变动）
watch(() => chapterStore.flattenedChapters.length, () => {
  if (!isSyncingFromEditor) {
    refreshDecorations()
  }
})

// 监听设置项变动，实时更新装饰器显示
watch(() => settingsStore.getSettings()['editor.showChapterHighlight'], () => {
  refreshDecorations()
})

// 监听当前激活章节的标题变动（用于模型 -> 正文的单向同步）
watch(() => activeChapter.value?.title, (newTitle, oldTitle) => {
  if (isSyncingFromEditor || !editor || !activeChapter.value || !newTitle || newTitle === oldTitle) return

  const model = editor.getModel()
  if (!model) return

  const decoId = chapterDecorations.get(activeChapter.value.id)
  if (!decoId) return

  const range = model.getDecorationRange(decoId)
  if (!range) return

  // 检查正文内容是否与模型不同，若不同则强制写入
  const currentLineText = model.getLineContent(range.startLineNumber)
  
  // 关键判断：如果模型标题是占位符 (未命名xxx)，且正文原本为空，则不要强制把占位符刷入正文
  // 这样可以保持编辑器行依然处于“待输入”的空白状态
  const isPlaceholder = newTitle.startsWith('未命名')
  if (!currentLineText.trim() && isPlaceholder) return

  if (currentLineText.trim() !== newTitle.trim()) {
    isSyncingFromEditor = true // 锁定以防止触发 syncStoreFromDecorations
    editor.executeEdits('model-to-text-sync', [{
      range: new monaco.Range(range.startLineNumber, 1, range.startLineNumber, currentLineText.length + 1),
      text: newTitle,
      forceMoveMarkers: true
    }])
    isSyncingFromEditor = false
  }
})
</script>

<style>
.chapter-anchor-highlight {
  border-left: 3px solid #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}
.dark .chapter-anchor-highlight {
  background: rgba(59, 130, 246, 0.15);
}
</style>
