import { onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { useUIStore } from '@/store/ui'

interface UsePanelResizeOptions {
  containerRef: Ref<HTMLElement | null>
  uiStore: ReturnType<typeof useUIStore>
}

export function usePanelResize(options: UsePanelResizeOptions) {
  let isResizing = false

  function handleResize(event: MouseEvent) {
    if (!isResizing || !options.containerRef.value) return
    const rect = options.containerRef.value.getBoundingClientRect()
    const newWidth = rect.right - event.clientX
    options.uiStore.setRightPanelWidth(newWidth)
  }

  function stopResize() {
    if (!isResizing) return
    isResizing = false
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', stopResize)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  function startResize() {
    isResizing = true
    document.addEventListener('mousemove', handleResize)
    document.addEventListener('mouseup', stopResize)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  onUnmounted(() => {
    stopResize()
  })

  return {
    startResize,
    stopResize
  }
}
