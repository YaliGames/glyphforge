<template>
  <div class="flex-1 flex overflow-hidden bg-[#f9f9f9] dark:bg-[#1a1a1a]">
    <!-- 目录树顶部操作栏 (规范 6.1) -->
    <SidePanel title="目录结构" width="w-64" side="left">
      <template #actions>
        <div class="flex items-center gap-1">
          <button v-if="settingsStore.getSettings()['ai.enabled']" @click="uiStore.openModal('recognition')"
            class="p-1.5 hover:bg-gray-200 dark:hover:bg-[#333] rounded text-gray-500 hover:text-blue-500 transition-colors"
            title="自动识别目录">
            <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
          </button>
                  <button 
          @click="uiStore.openModal('hierarchy-editor')"
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
        <EmptyState
          v-if="chapterStore.chapters.length === 0"
          subtitle="正文中尚无章节标记，选择一行并点击上方按钮添加为标题"
        />
      </div>
    </SidePanel>

    <!-- 中间：单文件正文编辑器 (规范 5.1 & 6.2) -->
    <main class="flex-1 flex flex-col relative bg-white dark:bg-[#1e1e1e] min-w-0">
      <div class="flex-1 relative">
        <MonacoEditor
          ref="monacoRef"
          :model-value="chapterStore.manuscriptContent"
          @update:model-value="debouncedContentUpdate"
          @mounted="onEditorMounted"
          @cursor-change="handleCursorChange"
          @selection-change="handleSelectionChange"
          @blur="projectStore.endEditSession()"
        />
      </div>
    </main>

    <!-- 右侧：属性与大纲参考 (规范 6.3) -->
    <SidePanel title="属性" width="w-80" side="right">
      <div v-if="activeChapter" class="p-5 space-y-6">
        <!-- 章节基本属性 -->
        <div class="space-y-4">
          <Input 
            :model-value="activeChapter.title"
            label="章节名称"
            placeholder="正文标题行会自动同步至此..."
            @update:model-value="(val) => chapterStore.updateChapter(activeChapter.id, { title: val })"
            @focus="startEdit()"
            @blur="endEdit()"
          />

          <!-- 章节标签 (用于判定角色阶段, 规范 2.3.2) -->
          <div class="space-y-2">
            <Input 
              :model-value="activeChapter.tags?.join(', ')"
              label="章节标签"
              icon-prefix="fa-solid fa-tags"
              placeholder="输入标签，用逗号分隔..."
              hint="用于自动判定该章节下角色所处的“叙事阶段”"
              @focus="startEdit()"
              @blur="endEdit()"
              @change="(e: any) => chapterStore.updateChapter(activeChapter.id, { tags: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })"
            />
          </div>
          
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-2">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">显示层级</label>
              <div class="w-full bg-gray-50 dark:bg-[#2d2d2d] rounded px-3 py-1.5 text-xs text-gray-500 font-bold border dark:border-[#333333]">
                {{ projectStore.bundle?.project.hierarchies?.find(h => h.depth === activeChapter.depth)?.name || '未定义层级' }}
              </div>
            </div>
            <div class="space-y-2">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">逻辑深度</label>
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
          <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">对应大纲情节</label>
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
        subtitle="在左侧菜单中选择一个标题，或将光标移动到设置的标题处"
      />
    </SidePanel>
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
import SidePanel from '@/components/layout/SidePanel.vue'
import ChapterTreeItem from '@/components/features/editor/ChapterTreeItem.vue'
import MonacoEditor from '@/components/features/editor/MonacoEditor.vue'
import Button from '@/components/common/Button.vue'
import Input from '@/components/common/Input.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const chapterStore = useChapterStore()
const outlineStore = useOutlineStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const settingsStore = useSettingsStore()
const { startEdit, endEdit } = useFieldHistory()

const activeChapterId = ref<string | null>(null)
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

let updateTimer: any = null
function debouncedContentUpdate(val: string) {
  if (updateTimer) clearTimeout(updateTimer)
  updateTimer = setTimeout(() => {
    chapterStore.manuscriptContent = val
  }, 500)
}

// 当发生撤销/重做时，立即取消正在排队的文本更新
watch(() => projectStore.isRestoring, (val) => {
  if (val && updateTimer) {
    clearTimeout(updateTimer)
    updateTimer = null
  }
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
  const toRemoveIds = new Set<string>()
  let needsReflow = false

  // 1. 扫描与分组：收集有效候选并按行分组
  const candidates: { id: string; line: number; text: string; range: monaco.Range, prevLine: number }[] = []
  const lineGroups = new Map<number, typeof candidates>()

  chapterStore.flattenedChapters.forEach(chapter => {
    const decoId = chapterDecorations.get(chapter.id)
    if (!decoId) return

    const range = model.getDecorationRange(decoId)
    if (!range || range.startLineNumber > model.getLineCount()) {
      toRemoveIds.add(chapter.id)
      return
    }

    const { startLineNumber: line } = range
    const text = model.getLineContent(line)
    
    // 过滤失效装饰器：
    // 1. Range 塌陷且非空行内容 -> 锚点已丢失
    // 2. 漂移检测：位置发生改变 且 内容也完全不同 -> 说明这是一次破坏性编辑导致的错误吸附（如大段删除）
    //    注：合法的“移动”应保持内容不变；合法的“修改”应保持位置不变（或仅微调）。
    const isCollapsed = range.isEmpty() && text.length > 0
    const isDrifted = line !== chapter.anchorLineNumber && text.trim() !== (chapter.anchorText || '').trim()

    if (isCollapsed || isDrifted) {
      toRemoveIds.add(chapter.id)
      return
    }

    const candidate = { id: chapter.id, line, text, range, prevLine: chapter.anchorLineNumber }
    candidates.push(candidate)
    
    if (!lineGroups.has(line)) lineGroups.set(line, [])
    lineGroups.get(line)!.push(candidate)
  })

  // 2. 冲突解决：同一行多章节时，仅保留原住民
  // 如果所有候选者都是外来的（发生了移动），说明这是多个章节被挤压到了同一行，应全部废弃
  lineGroups.forEach((group, line) => {
    if (group.length <= 1) return
    const keep = group.find(c => c.prevLine === line) // 移除 || group[0]，不再强行保留
    group.forEach(c => c !== keep && toRemoveIds.add(c.id))
  })

  // 3. 应用更新
  candidates.forEach(c => {
    if (toRemoveIds.has(c.id)) return
    
    const chapter = (chapterStore.flattenedChapters as any[]).find(ch => ch.id === c.id)
    if (!chapter) return

    // 若 Range 跨行（通常由换行引起），标记需要刷新装饰器
    if (c.range.startLineNumber !== c.range.endLineNumber) needsReflow = true

    const trimmedText = c.text.trim()
    let title = trimmedText
    
    // 处理空标题占位符
    if (!title) {
      const h = projectStore.bundle?.project.hierarchies?.find(h => h.depth === chapter.depth)
      title = `未命名${h ? h.name : '章节'}`
    }

    if (chapter.anchorLineNumber !== c.line || chapter.title !== title) {
      chapterStore.updateChapter(chapter.id, {
        anchorLineNumber: c.line,
        title,
        anchorText: trimmedText
      })
    }
  })

  // 4. 执行删除与刷新
  if (toRemoveIds.size > 0) {
    toRemoveIds.forEach(id => {
      chapterStore.removeChapter(id)
      chapterDecorations.delete(id)
      if (activeChapterId.value === id) activeChapterId.value = null
    })
    refreshDecorations()
    projectStore.endEditSession()
  } else if (needsReflow) {
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

function handleSelectionChange(selection: monaco.IRange) {
  if (!editor) return
  const model = editor.getModel()
  if (!model) return

  const text = model.getValueInRange(selection)
  if (text.trim()) {
    uiStore.editorSelection = {
      startLine: selection.startLineNumber,
      endLine: selection.endLineNumber,
      text: text.length > 50 ? text.slice(0, 50) + '...' : text
    }
  } else {
    uiStore.editorSelection = null
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
