export interface AIMentionType {
  value: string
  label: string
  icon: string
}

export const AI_MENTION_TYPES: AIMentionType[] = [
  { value: 'character', label: '角色', icon: 'fa-user-circle' },
  { value: 'outline', label: '大纲', icon: 'fa-scroll' },
  { value: 'worldview', label: '世界观设定', icon: 'fa-earth-asia' },
  { value: 'chapters', label: '目录', icon: 'fa-list-ul' },
  { value: 'manuscript', label: '正文', icon: 'fa-file-lines' },
  { value: 'timeline', label: '时间线', icon: 'fa-clock-rotate-left' }
]

export const AI_MENTION_TYPE_LABEL_MAP: Record<string, string> = AI_MENTION_TYPES.reduce((labelMap, typeItem) => {
  labelMap[typeItem.value] = typeItem.label
  return labelMap
}, {} as Record<string, string>)
