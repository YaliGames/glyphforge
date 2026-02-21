import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GlyphForgeBundle } from '@/types'

export interface HistoryState {
  bundle: GlyphForgeBundle
}

/**
 * 全局历史记录存储 (规范 7/10)
 * 用于实现跨视图的结构化撤销/重做
 */
export const useHistoryStore = defineStore('history', () => {
  const past = ref<string[]>([])
  const future = ref<string[]>([])
  const MAX_HISTORY = 50

  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  /**
   * 记录一个检查点
   */
  function pushState(bundle: GlyphForgeBundle) {
    const newState = JSON.stringify({ bundle })
    
    if (past.value.length > 0 && past.value[past.value.length - 1] === newState) {
      return false
    }

    if (past.value.length >= MAX_HISTORY) past.value.shift()
    
    past.value.push(newState)
    future.value = []
    return true
  }

  function pushRawState(rawState: string) {
    if (past.value.length > 0 && past.value[past.value.length - 1] === rawState) {
      return false
    }

    if (past.value.length >= MAX_HISTORY) past.value.shift()
    
    past.value.push(rawState)
    future.value = []
    return true
  }

  function undo(currentBundle: GlyphForgeBundle): HistoryState | null {
    if (!canUndo.value) return null

    const currentJSON = JSON.stringify({ bundle: currentBundle })
    
    // 如果重做条目与当前状态相同，则不再推入，避免重做空转
    if (future.value.length === 0 || future.value[future.value.length - 1] !== currentJSON) {
      future.value.push(currentJSON)
    }

    const previous = past.value.pop()!
    const state = JSON.parse(previous)
    
    // 如果回退后的状态竟然和现在的状态一模一样，则继续往回走一步（处理失焦导致的冗余快照）
    if (JSON.stringify(state.bundle) === JSON.stringify(currentBundle) && canUndo.value) {
      return undo(currentBundle)
    }

    return state
  }

  function redo(currentBundle: GlyphForgeBundle): HistoryState | null {
    if (!canRedo.value) return null

    const currentJSON = JSON.stringify({ bundle: currentBundle })
    
    // 同样，重做前先把当前状态存入撤销栈
    if (past.value.length === 0 || past.value[past.value.length - 1] !== currentJSON) {
      past.value.push(currentJSON)
    }

    const next = future.value.pop()!
    const state = JSON.parse(next)
    
    // 如果重做后的状态和现在一模一样，递归寻找真正的下一个状态
    if (JSON.stringify(state.bundle) === JSON.stringify(currentBundle) && canRedo.value) {
      return redo(currentBundle)
    }

    return state
  }

  function clear() {
    past.value = []
    future.value = []
  }

  return {
    canUndo,
    canRedo,
    pushState,
    pushRawState,
    undo,
    redo,
    clear
  }
})
