import { computed, ref, watch } from 'vue'
import type { ComputedRef } from 'vue'
import type { Router } from 'vue-router'
import type { AIReference, ReferenceNode } from '@/types'
import { PROJECT_REFERENCE_TREE } from '@/types'
import type { useAIStore } from '@/store/ai'
import type { useCharacterStore } from '@/store/characters'
import type { useWorldviewStore } from '@/store/worldview'
import type { useUIStore } from '@/store/ui'
import { AI_MENTION_TYPE_LABEL_MAP } from './constants'

interface UseAIReferencesOptions {
  aiStore: ReturnType<typeof useAIStore>
  characterStore: ReturnType<typeof useCharacterStore>
  worldviewStore: ReturnType<typeof useWorldviewStore>
  uiStore: ReturnType<typeof useUIStore>
  router: Router
}

function createRangeReference(type: string, typeLabel: string, rangeLike: any): AIReference {
  return {
    type,
    id: `range:${rangeLike.start}-${rangeLike.end}`,
    label: rangeLike.label || `${typeLabel}: ${rangeLike.start}-${rangeLike.end}`,
    range: { start: rangeLike.start, end: rangeLike.end }
  }
}

export function useAIReferences(options: UseAIReferencesOptions) {
  const { aiStore, characterStore, worldviewStore, uiStore, router } = options

  const selectedPromptId = computed({
    get: () => aiStore.selectedPromptId,
    set: (val) => {
      aiStore.selectedPromptId = val
    }
  })

  const granularSelections = computed({
    get: () => aiStore.granularSelections,
    set: (val) => {
      aiStore.granularSelections = val
    }
  })

  const expandedKeys = ref<string[]>([])

  function getOptionsForValue(val: string) {
    return aiStore.getContextOptions(val)
  }

  function findNodeByValue(targetValue: string, nodes: ReferenceNode[] = PROJECT_REFERENCE_TREE): ReferenceNode | null {
    for (const node of nodes) {
      if (node.value === targetValue) return node
      if (node.children) {
        const found = findNodeByValue(targetValue, node.children)
        if (found) return found
      }
    }
    return null
  }

  const activeReferences = computed(() => {
    const refs: AIReference[] = []

    aiStore.referenceKeys.forEach(key => {
      const node = findNodeByValue(key)
      if (!node) return

      const typeLabel = AI_MENTION_TYPE_LABEL_MAP[key] || node.label

      if (!node.isGranular) {
        refs.push({ type: key, id: 'all', label: `${typeLabel}: 所有` })
        return
      }

      const selectedIds = aiStore.granularSelections[key] || []
      const optionsForType = aiStore.getContextOptions(key)
      const hasOnlyPrimitiveIds = !selectedIds.some(id => typeof id === 'object')

      if (selectedIds.length > 0 && selectedIds.length === optionsForType.length && hasOnlyPrimitiveIds) {
        refs.push({ type: key, id: 'all', label: `${typeLabel}: 所有` })
        return
      }

      selectedIds.forEach(id => {
        if (typeof id === 'object' && id?.start !== undefined) {
          refs.push(createRangeReference(key, typeLabel, id))
          return
        }

        const opt = optionsForType.find((item: any) => item.id === id)
        if (opt) {
          refs.push({ type: key, id: String(id), label: `${typeLabel}: ${opt.label}` })
        }
      })
    })

    return refs
  })

  watch(activeReferences, (newRefs) => {
    aiStore.activeReferences = newRefs
  }, { immediate: true })

  function syncCategorySelection(key: string) {
    const hasItems = (granularSelections.value[key]?.length || 0) > 0
    const refIndex = aiStore.referenceKeys.indexOf(key)

    if (hasItems) {
      if (refIndex === -1) aiStore.referenceKeys.push(key)
      return
    }

    if (refIndex !== -1) {
      aiStore.referenceKeys.splice(refIndex, 1)
    }
  }

  function toggleContext(value: string) {
    const node = findNodeByValue(value)
    if (node?.isGranular) {
      const idx = expandedKeys.value.indexOf(value)
      if (idx === -1) expandedKeys.value.push(value)
      else expandedKeys.value.splice(idx, 1)
      return
    }

    const index = aiStore.referenceKeys.indexOf(value)
    if (index === -1) aiStore.referenceKeys.push(value)
    else aiStore.referenceKeys.splice(index, 1)
  }

  function toggleGranularItem(key: string, id: string) {
    if (!granularSelections.value[key]) granularSelections.value[key] = []

    const index = granularSelections.value[key].indexOf(id)
    if (index === -1) granularSelections.value[key].push(id)
    else granularSelections.value[key].splice(index, 1)

    syncCategorySelection(key)
  }

  function toggleSelectAll(key: string) {
    const allOptions = getOptionsForValue(key)
    const currentSelected = granularSelections.value[key] || []

    if (currentSelected.length === allOptions.length) {
      granularSelections.value[key] = []
    } else {
      granularSelections.value[key] = allOptions.map((item: any) => item.id)
    }

    syncCategorySelection(key)
  }

  function removeReference(ref: AIReference) {
    if (ref.id === 'all') {
      const keyIndex = aiStore.referenceKeys.indexOf(ref.type)
      if (keyIndex !== -1) aiStore.referenceKeys.splice(keyIndex, 1)

      if (aiStore.granularSelections[ref.type]) {
        aiStore.granularSelections[ref.type] = []
      }
      return
    }

    const items = aiStore.granularSelections[ref.type] || []
    let targetIndex = -1

    if (ref.id.startsWith('range:')) {
      targetIndex = items.findIndex((item: any) => {
        return typeof item === 'object' && `range:${item.start}-${item.end}` === ref.id
      })
    } else {
      targetIndex = items.indexOf(ref.id)
    }

    if (targetIndex !== -1) {
      items.splice(targetIndex, 1)
    }

    syncCategorySelection(ref.type)
  }

  function addCurrentEntityToReference() {
    const path = router.currentRoute.value.path
    let type: string | null = null
    let id: any = ''
    let label = ''
    let range: { start: number; end: number } | undefined

    if (path === '/editor') {
      type = 'manuscript'
      if (uiStore.editorSelection) {
        id = `range:${uiStore.editorSelection.startLine}-${uiStore.editorSelection.endLine}`
        label = `正文: ${uiStore.editorSelection.startLine}-${uiStore.editorSelection.endLine}`
        range = { start: uiStore.editorSelection.startLine, end: uiStore.editorSelection.endLine }
      } else {
        uiStore.showToast('请先在正文中选择一段文字', 'warning')
        return
      }
    } else if (path === '/outline') {
      type = 'outline'
      if (uiStore.editorSelection) {
        id = `range:${uiStore.editorSelection.startLine}-${uiStore.editorSelection.endLine}`
        label = `大纲: ${uiStore.editorSelection.startLine}-${uiStore.editorSelection.endLine}`
        range = { start: uiStore.editorSelection.startLine, end: uiStore.editorSelection.endLine }
      } else {
        uiStore.showToast('请先在大纲编辑器中选择文字', 'warning')
        return
      }
    } else if (path === '/characters') {
      if (characterStore.activeCharacterId) {
        const currentCharacter = characterStore.charactersInPhase.find(item => item.id === characterStore.activeCharacterId)
        if (currentCharacter) {
          type = 'character'
          id = currentCharacter.id
          label = `角色: ${currentCharacter.name}`
        }
      }
    } else if (path === '/worldview') {
      if (worldviewStore.activeCategoryType) {
        const category = worldviewStore.worldview?.categories.find(item => item.type === worldviewStore.activeCategoryType)
        if (category) {
          type = 'worldview'
          id = category.type
          label = `设定: ${category.name}`
        }
      }
    } else if (path === '/timeline') {
      type = 'timeline'
      id = 'timeline_default'
      label = '参考: 时间线'
    }

    if (!type) {
      uiStore.showToast('当前页面没有可引用的具体内容', 'info')
      return
    }

    if (!aiStore.referenceKeys.includes(type)) {
      aiStore.referenceKeys.push(type)
    }

    if ((type === 'manuscript' || type === 'outline') && range) {
      if (!aiStore.granularSelections[type]) aiStore.granularSelections[type] = []

      const exists = aiStore.granularSelections[type].find((item: any) => {
        return typeof item === 'object' && item.start === range!.start && item.end === range!.end
      })

      if (!exists) {
        aiStore.granularSelections[type].push({ ...range, label })
      }
    } else {
      if (!aiStore.granularSelections[type]) aiStore.granularSelections[type] = []
      if (!aiStore.granularSelections[type].includes(id)) {
        aiStore.granularSelections[type].push(id)
      }
    }

    uiStore.showToast(`已引用 ${label}`, 'success')
  }

  const canReferenceCurrent = computed(() => {
    const path = router.currentRoute.value.path
    if (path === '/editor' || path === '/outline') return !!uiStore.editorSelection
    if (path === '/characters') return !!characterStore.activeCharacterId
    if (path === '/worldview') return !!worldviewStore.activeCategoryType
    if (path === '/timeline') return true
    return false
  })

  function expandActiveKeys() {
    aiStore.referenceKeys.forEach(key => {
      const node = findNodeByValue(key)
      if (node?.isGranular && !expandedKeys.value.includes(key)) {
        expandedKeys.value.push(key)
      }
    })
  }

  const referenceTypeLabelMap: ComputedRef<Record<string, string>> = computed(() => AI_MENTION_TYPE_LABEL_MAP)

  return {
    selectedPromptId,
    granularSelections,
    expandedKeys,
    referenceTypeLabelMap,
    activeReferences,
    getOptionsForValue,
    findNodeByValue,
    toggleContext,
    toggleGranularItem,
    toggleSelectAll,
    removeReference,
    syncCategorySelection,
    addCurrentEntityToReference,
    canReferenceCurrent,
    expandActiveKeys
  }
}
