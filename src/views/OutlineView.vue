<template>
  <div class="flex-1 flex overflow-hidden bg-app-main">
    <!-- 左栏：大纲树 -->
    <SidePanel title="大纲结构" width="w-64" side="left">
      <template #actions>
        <IconButton
          icon="fa-solid fa-plus"
          size="sm"
          variant="primary"
          title="创建新幕"
          @click="createNewAct"
        />
      </template>

      <div class="p-2 space-y-1">
        <template v-for="item in listItems" :key="item.id">
          <!-- 分割线 -->
          <div v-if="item.isSeparator" class="my-3 flex items-center gap-2 px-2">
            <div class="h-[1px] flex-1 bg-divider"></div>
            <span class="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">已绑定正文</span>
            <div class="h-[1px] flex-1 bg-divider"></div>
          </div>

          <!-- 普通项 -->
          <div v-else @click="jumpToAct(item.id)"
            class="p-2 rounded-main cursor-pointer transition-all duration-200 group relative hover:translate-x-0.5"
            :class="currentActId === item.id ? 'bg-app-active text-blue-600 dark:text-blue-400 shadow-sm' : 'hover:bg-app-hover text-gray-600 dark:text-gray-400'">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <i class="fa-solid fa-bookmark text-[10px] opacity-50 transition-transform group-hover:scale-110"></i>
                <span class="text-xs truncate font-medium">{{ item.title }}</span>
              </div>
              <!-- 未绑定标签/绑定按钮 (Hover 切换) -->
              <div v-if="!item.range" class="relative flex items-center h-5 shrink-0">
                <span
                  class="group-hover:hidden px-1.5 py-0.5 rounded-[4px] bg-app-hover text-gray-400 text-[9px] whitespace-nowrap">
                  未绑定
                </span>
                <Button size="xs" :rounded="false" class="hidden group-hover:flex !px-2 !py-0.5"
                  @click.stop="bindSelectionToAct(item.id)">
                  绑定
                </Button>
              </div>
            </div>
            <p v-if="item.purpose" class="text-[10px] truncate opacity-40 ml-5">{{ item.purpose }}</p>
          </div>
        </template>
        <div v-if="acts.length === 0" class="py-10 text-center text-xs text-gray-400">
          暂无结构化大纲<br />在中栏点击“设定为幕”开始
        </div>
      </div>
    </SidePanel>

    <!-- 中栏：主编辑区 -->
    <main class="flex-1 flex flex-col relative min-w-0">
      <div
        class="h-10 border-b border-divider flex items-center px-4 justify-between bg-app-panel/50 shrink-0">
        <div class="flex items-center gap-4">
          <span class="text-ui-header">大纲正文</span>
        </div>
        <div class="flex items-center gap-2">
          <Button size="xs" icon="fa-solid fa-plus text-[9px]" @click="createActFromSelection" title="将当前选中的正文创建为一幕">
            选区创建幕
          </Button>
        </div>
      </div>
      <div class="flex-1 relative">
        <OutlineEditor ref="editorRef" v-model="narrativeSummary" class="absolute inset-0" :acts="acts"
          @cursor-change="handleCursorChange" @selection-change="handleSelectionChange" />
      </div>
    </main>

    <!-- 结构属性区 -->
    <SidePanel v-if="!aiStore.isVisible" title="属性" width="w-80" side="right">
      <template #actions>
        <div v-if="currentAct">
          <span v-if="currentAct.range"
            class="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 text-[9px] rounded-full">已绑定</span>
          <span v-else class="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-400 text-[9px] rounded-full">未绑定</span>
        </div>
      </template>

      <div v-if="currentAct" class="p-5 space-y-6">
        <Input
          v-model="currentAct.title"
          label="幕标题"
          icon-prefix="fa-solid fa-heading"
          placeholder="为这一幕起个名字..."
          @input="updateAct"
          @focus="startEdit()"
          @blur="endEdit()"
        />

        <div
          class="p-4 rounded-main bg-app-active border border-blue-100 dark:border-blue-800/30 border-dashed space-y-3">
          <p class="text-[11px] text-blue-600 dark:text-blue-400 font-medium">正文绑定操作</p>
          <div class="flex gap-2">
            <Button outline size="xs" class="flex-1" @click="bindSelectionToCurrentAct">
              绑定当前选区
            </Button>
            <Button v-if="currentAct.range" outline color="red" size="xs" @click="unbindCurrentAct">
              解绑
            </Button>
          </div>
          <p v-if="currentAct.range" class="text-[10px] text-gray-400 font-mono">
            行区间: {{ currentAct.range.startLine }} - {{ currentAct.range.endLine }}
          </p>
        </div>

        <Input
          v-model="currentAct.purpose"
          type="textarea"
          label="构思目的 (Purpose)"
          icon-prefix="fa-solid fa-bullseye"
          placeholder="这一幕在故事中起到什么作用？要解决什么冲突？"
          auto-resize
          :rows="8"
          @input="updateAct"
          @focus="startEdit()"
          @blur="endEdit()"
        />

        <div class="pt-6 border-t border-divider">
          <Button outline color="red" size="sm" class="w-full" icon="fa-solid fa-trash-can" @click="deleteCurrentAct">
            移除此幕结构 (保留文字)
          </Button>
        </div>
      </div>
      <EmptyState v-else icon="fa-i-cursor" size="md" subtitle="在左侧菜单中选择一个幕，或将光标移动到绑定幕的文本处" />
    </SidePanel>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOutlineStore } from '@/store/outline'
import { useAIStore } from '@/store/ai'
import { useUIStore } from '@/store/ui'
import { useFieldHistory } from '@/composables/useFieldHistory'
import { shouldConfirmDelete } from '@/utils/deleteConfirmation'
import OutlineEditor from '@/components/features/editor/OutlineEditor.vue'
import SidePanel from '@/components/layout/SidePanel.vue'
import Button from '@/components/common/Button.vue'
import IconButton from '@/components/common/IconButton.vue'
import Input from '@/components/common/Input.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import * as monaco from 'monaco-editor'
import type { OutlineAct } from '@/types'

const outlineStore = useOutlineStore()
const aiStore = useAIStore()
const uiStore = useUIStore()
const { startEdit, endEdit } = useFieldHistory()
const editorRef = ref<any>(null)

const narrativeSummary = computed({
  get: () => outlineStore.content.join('\n') || '',
  set: (val) => outlineStore.updateNarrativeSummary(val)
})

const acts = computed(() => outlineStore.acts)

// 排序后的大纲列表：未绑定在前，已绑定按正文顺序在后，中间有分割逻辑
interface SortableAct extends Partial<OutlineAct> {
  id: string
  isSeparator?: boolean
}

const listItems = computed(() => {
  const allActs = [...acts.value]

  // 1. 分离已绑定和未绑定 (注意：Store 已经按照物理逻辑排好序了：已绑定在前按行号，未绑定在后)
  const bound = allActs.filter(a => !!a.range)
  const unbound = allActs.filter(a => !a.range)

  const result: SortableAct[] = []

  // 2. 加入已绑定
  result.push(...bound)

  // 3. 间隔符 (如果两边都有)
  if (unbound.length > 0 && bound.length > 0) {
    result.push({ id: 'separator-line', isSeparator: true })
  }

  // 4. 加入未绑定
  result.push(...unbound)

  return result
})

const currentActId = ref<string | null>(null)
const currentAct = computed(() => {
  if (!currentActId.value) return null
  return acts.value.find((a: OutlineAct) => a.id === currentActId.value) || null
})

function handleCursorChange({ activeActId }: { activeActId: string | null }) {
  // 核心：根据光标位置自动切换激活的幕，如果不在任何幕内则清除激活状态
  currentActId.value = activeActId
}

function handleSelectionChange(selection: monaco.IRange) {
  if (selection.startLineNumber !== selection.endLineNumber || (selection as any).startColumn !== (selection as any).endColumn) {
    uiStore.editorSelection = {
      startLine: selection.startLineNumber,
      endLine: selection.endLineNumber,
      text: '大纲...'
    }
  } else {
    uiStore.editorSelection = null
  }
}

function createNewAct() {
  // 创建未绑定幕 (规范 7.2)
  const act = outlineStore.createAct()
  if (act) currentActId.value = act.id
}

async function createActFromSelection() {
  const editor = editorRef.value?.getEditor()
  if (!editor) return
  const selection = editor.getSelection()
  if (!selection) return

  const range = {
    startLine: selection.startLineNumber,
    endLine: selection.endLineNumber
  }

  // 冲突检测
  const hasConflict = acts.value.some((a: OutlineAct) => a.range && (range.startLine <= a.range.endLine && range.endLine >= a.range.startLine))
  if (hasConflict) {
    const ok = await uiStore.showConfirm({
      title: '覆盖绑定',
      message: '选区与已有幕重叠，确认覆盖已有绑定状态吗？',
      type: 'warning'
    })
    if (!ok) return
  }

  const act = outlineStore.createAct('从选区创建的幕', range)
  if (act) {
    currentActId.value = act.id
    // 恢复焦点
    editor.focus()
  }
}

async function bindSelectionToCurrentAct() {
  if (currentActId.value) {
    bindSelectionToAct(currentActId.value)
  }
}

async function bindSelectionToAct(id: string) {
  const success = await editorRef.value?.bindSelectionToAct(id)
  if (success) {
    editorRef.value?.getEditor()?.focus()
    currentActId.value = id
  }
}

function unbindCurrentAct() {
  if (currentActId.value) {
    outlineStore.unbindAct(currentActId.value)
  }
}

function updateAct() {
  if (currentAct.value) {
    outlineStore.updateActMetadata(currentAct.value.id, {
      title: currentAct.value.title,
      purpose: currentAct.value.purpose
    })
  }
}

async function deleteCurrentAct() {
  if (currentActId.value) {
    const needsConfirm = shouldConfirmDelete('outline')
    
    if (needsConfirm) {
      const ok = await uiStore.showConfirm({
        title: '删除幕',
        message: '确定要删除这一幕吗？正文内容不会受影响。',
        type: 'danger'
      })
      if (!ok) return
    }
    
    outlineStore.removeAct(currentActId.value)
    currentActId.value = null
  }
}

function jumpToAct(id: string) {
  const act = acts.value.find((a: OutlineAct) => a.id === id)
  if (!act || !act.range) {
    currentActId.value = id
    return
  }

  const editor = editorRef.value?.getEditor()
  if (editor) {
    const startLine = act.range.startLine
    editor.revealLineInCenter(startLine)
    editor.setPosition({ lineNumber: startLine, column: 1 })
    editor.focus()
    currentActId.value = id
  }
}
</script>
