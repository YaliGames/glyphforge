import { useProjectStore } from '@/store/project'
import { useUIStore } from '@/store/ui'

export function useSaveCheck() {
  const projectStore = useProjectStore()
  const uiStore = useUIStore()

  /**
   * 如果当前有未保存的内容，提示用户保存
   * @param saveCallback 执行保存的具体逻辑，返回保存是否成功（或是否继续）
   * @returns 是否可以继续后续操作
   */
  const confirmSaveIfDirty = async (saveCallback: () => Promise<boolean>) => {
    if (projectStore.isDirty) {
      const result = await uiStore.showConfirm({
        title: '保存更改',
        message: '是否保存对当前项目的更改？',
        confirmText: '保存',
        extraText: '不保存',
        cancelText: '取消',
        type: 'warning'
      })

      if (result === false) {
        return false // 取消操作，不继续
      } else if (result === true) {
        return await saveCallback() // 执行保存，根据保存结果决定是否继续
      }
      // 'extra' (不保存)，继续执行
    }
    return true
  }

  return { confirmSaveIfDirty }
}
