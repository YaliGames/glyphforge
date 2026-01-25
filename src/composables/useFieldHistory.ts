import { useProjectStore } from '@/store/project'

/**
 * 字段级历史记录追踪辅助
 * 代理到 ProjectStore 的会话管理机制，实现统一的“懒加载快照”体验
 */
export function useFieldHistory() {
  const projectStore = useProjectStore()

  /**
   * 开始编辑：开启一个编辑会话，挂起初始快照
   */
  const startEdit = () => {
    projectStore.startEditSession()
  }

  /**
   * 结束编辑：结束会话，如果在会话期间无数据变动，或者挂起的快照未被提交，则丢弃
   */
  const endEdit = () => {
    projectStore.endEditSession()
  }

  return { startEdit, endEdit }
}
