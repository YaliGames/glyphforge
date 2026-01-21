import { useProjectStore } from '@/store/project'

/**
 * 字段级历史记录追踪辅助
 * 用于处理 input/textarea focus/blur 时刻的差异化快照
 */
export function useFieldHistory() {
  const projectStore = useProjectStore()

  /**
   * 开始编辑：在真正发生变动前，记录当前状态到历史栈
   */
  const startEdit = () => {
    // 立即存入快照，保存的是变动前的状态
    projectStore.takeSnapshot()
  }

  /**
   * 结束编辑：此环节不再产生快照，因为撤销逻辑需要的是“变动前”的状态
   */
  const endEdit = () => {
    // 逻辑已移除，由 startEdit 预存快照
  }

  return { startEdit, endEdit }
}
