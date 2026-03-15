import { computed, nextTick, reactive, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { useAIStore } from '@/store/ai'
import { AI_MENTION_TYPES, type AIMentionType } from './constants'

interface UseAIMentionMenuOptions {
  aiStore: ReturnType<typeof useAIStore>
  input: Ref<string>
  inputAreaRef: Ref<any>
  syncCategorySelection: (key: string) => void
}

interface AIMentionMenuState {
  visible: boolean
  step: 1 | 2
  search: string
  selectedType: string | null
  selectedIndex: number
  rect: { top: number; left: number }
  types: AIMentionType[]
  instances: any[]
}

export function useAIMentionMenu(options: UseAIMentionMenuOptions) {
  const { aiStore, input, inputAreaRef, syncCategorySelection } = options

  const atScrollContainer1 = ref<HTMLElement | null>(null)
  const atScrollContainer2 = ref<HTMLElement | null>(null)

  const atMenu = reactive<AIMentionMenuState>({
    visible: false,
    step: 1,
    search: '',
    selectedType: null,
    selectedIndex: 0,
    rect: { top: 0, left: 0 },
    types: AI_MENTION_TYPES,
    instances: []
  })

  const filteredAtInstances = computed(() => {
    const query = atMenu.search.toLowerCase()
    const list = [{ id: 'all', label: '所有' }, ...atMenu.instances]

    if (!query) return list
    return list.filter(item => (item.label || '').toLowerCase().includes(query))
  })

  watch([() => atMenu.selectedIndex, () => atMenu.step], async () => {
    if (!atMenu.visible) return

    await nextTick()

    const container = atMenu.step === 1 ? atScrollContainer1.value : atScrollContainer2.value
    if (!container) return

    const activeItem = container.querySelector('.active-at-item') as HTMLElement | null
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest', behavior: 'auto' })
    }
  })

  function closeAtMenu() {
    atMenu.visible = false
    atMenu.selectedType = null
    atMenu.instances = []
  }

  function handleAtInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement
    const cursor = textarea.selectionStart
    const value = textarea.value
    const textBefore = value.substring(0, cursor)

    const lastAtIndex = textBefore.lastIndexOf('@')
    if (lastAtIndex === -1) {
      if (atMenu.visible) closeAtMenu()
      return
    }

    const query = textBefore.substring(lastAtIndex + 1)
    atMenu.visible = true

    const foundType = atMenu.types.find(typeItem => query.startsWith(typeItem.label))

    if (foundType) {
      atMenu.step = 2
      atMenu.selectedType = foundType.value
      atMenu.instances = aiStore.getContextOptions(foundType.value)
      atMenu.search = query.substring(foundType.label.length).trimStart()
    } else {
      atMenu.step = 1
      atMenu.search = query
      atMenu.selectedType = null
    }

    atMenu.selectedIndex = 0
  }

  async function selectAtType(type: AIMentionType) {
    atMenu.selectedType = type.value
    atMenu.step = 2
    atMenu.selectedIndex = 0
    atMenu.search = ''
    atMenu.instances = aiStore.getContextOptions(type.value)

    const textarea = inputAreaRef.value?.el as HTMLTextAreaElement | undefined
    if (!textarea) return

    const cursor = textarea.selectionStart
    const textBefore = textarea.value.substring(0, cursor)
    const lastAtIndex = textBefore.lastIndexOf('@')
    const textAfter = textarea.value.substring(cursor)

    const newTextBefore = textarea.value.substring(0, lastAtIndex + 1) + type.label + ' '
    input.value = newTextBefore + textAfter

    await nextTick()
    const newCursor = newTextBefore.length
    textarea.setSelectionRange(newCursor, newCursor)
    textarea.focus()
  }

  function handleAtBlur() {
    window.setTimeout(() => {
      closeAtMenu()
    }, 200)
  }

  function confirmAtReference(instance: any) {
    const type = atMenu.selectedType
    if (!type) return

    if (instance.id === 'all') {
      if (!aiStore.referenceKeys.includes(type)) {
        aiStore.referenceKeys.push(type)
      }
      const options = aiStore.getContextOptions(type)
      aiStore.granularSelections[type] = options.map((item: any) => item.id)
    } else {
      if (!aiStore.granularSelections[type]) aiStore.granularSelections[type] = []

      const isRange = typeof instance.id === 'object' && instance.id.start !== undefined
      const exists = isRange
        ? aiStore.granularSelections[type].some((item: any) => {
            return typeof item === 'object' && item.start === instance.id.start && item.end === instance.id.end
          })
        : aiStore.granularSelections[type].includes(instance.id)

      if (!exists) {
        aiStore.granularSelections[type].push(instance.id)
      }

      syncCategorySelection(type)
    }

    const textarea = inputAreaRef.value?.el as HTMLTextAreaElement | undefined
    if (textarea) {
      const cursor = textarea.selectionStart
      const textBefore = textarea.value.substring(0, cursor)
      const lastAtIndex = textBefore.lastIndexOf('@')
      const textAfter = textarea.value.substring(cursor)

      input.value = textarea.value.substring(0, lastAtIndex) + textAfter

      nextTick(() => {
        textarea.setSelectionRange(lastAtIndex, lastAtIndex)
        textarea.focus()
      })
    }

    closeAtMenu()
  }

  function handleAtKeydown(event: KeyboardEvent) {
    if (!atMenu.visible) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const max = atMenu.step === 1 ? atMenu.types.length : filteredAtInstances.value.length
      if (max > 0) atMenu.selectedIndex = (atMenu.selectedIndex + 1) % max
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const max = atMenu.step === 1 ? atMenu.types.length : filteredAtInstances.value.length
      if (max > 0) atMenu.selectedIndex = (atMenu.selectedIndex - 1 + max) % max
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (atMenu.step === 1) {
        const selectedType = atMenu.types[atMenu.selectedIndex]
        if (selectedType) selectAtType(selectedType)
      } else {
        const selectedInstance = filteredAtInstances.value[atMenu.selectedIndex]
        if (selectedInstance) confirmAtReference(selectedInstance)
      }
      return
    }

    if (event.key === 'Escape') {
      closeAtMenu()
      return
    }

    if (event.key === 'Backspace' && atMenu.step === 2 && !atMenu.search) {
      event.preventDefault()
      atMenu.step = 1
      atMenu.selectedIndex = 0
    }
  }

  return {
    atMenu,
    atScrollContainer1,
    atScrollContainer2,
    filteredAtInstances,
    handleAtInput,
    selectAtType,
    handleAtBlur,
    confirmAtReference,
    closeAtMenu,
    handleAtKeydown
  }
}
