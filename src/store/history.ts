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
    return pushRawState(newState)
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
    
    // 递归处理：如果回退后的内容与当前无异，继续回退
    if (JSON.stringify(state.bundle) === currentJSON && canUndo.value) {
      return undo(currentBundle)
    }

    return state
  }

  function redo(currentBundle: GlyphForgeBundle): HistoryState | null {
    if (!canRedo.value) return null

    const currentJSON = JSON.stringify({ bundle: currentBundle })
    
    // 重做前将当前状态存入撤销栈
    if (past.value.length === 0 || past.value[past.value.length - 1] !== currentJSON) {
      past.value.push(currentJSON)
    }

    const next = future.value.pop()!
    const state = JSON.parse(next)
    
    // 递归处理：如果重做后的内容与当前无异，继续重做
    if (JSON.stringify(state.bundle) === currentJSON && canRedo.value) {
      return redo(currentBundle)
    }

    return state
  }

  function clear() {
    past.value = []
    future.value = []
  }

  function clearRedo() {
    future.value = []
  }

  return {
    canUndo,
    canRedo,
    pushState,
    pushRawState,
    undo,
    redo,
    clear,
    clearRedo
  }
})
