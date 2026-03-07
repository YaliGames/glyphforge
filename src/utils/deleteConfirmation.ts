import { useSettingsStore } from '@/store/settings'

export type DeleteOperationType = 'outline' | 'chapter' | 'character' | 'worldviewCategory' | 'worldviewItem' | 'timelineEvent'

/**
 * 判断删除操作是否需要用户确认
 * 
 * @param operationType 删除操作类型
 * @returns 是否需要确认
 * 
 * @example
 * if (shouldConfirmDelete('chapter')) {
 *   const confirmed = await showConfirm(...)
 *   if (!confirmed) return
 * }
 * deleteChapter(id)
 */
export function shouldConfirmDelete(operationType: DeleteOperationType): boolean {
  const settingsStore = useSettingsStore()
  
  const mainEnabled = settingsStore.getSetting('safety.deleteConfirmationEnabled', true)
  if (!mainEnabled) return false

  const typeMap: Record<DeleteOperationType, string> = {
    'outline': 'safety.confirmDeleteOutlineStructure',
    'chapter': 'safety.confirmDeleteChapter',
    'character': 'safety.confirmDeleteCharacter',
    'worldviewCategory': 'safety.confirmDeleteWorldviewCategory',
    'worldviewItem': 'safety.confirmDeleteWorldviewItem',
    'timelineEvent': 'safety.confirmDeleteTimelineEvent'
  }

  return settingsStore.getSetting(typeMap[operationType], true)
}
