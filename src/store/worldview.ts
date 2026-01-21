import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useProjectStore } from './project'
import type { WorldCategory, WorldTimelineEvent } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export const useWorldviewStore = defineStore('worldview', () => {
  const projectStore = useProjectStore()

  const worldview = computed(() => projectStore.bundle?.worldview || null)
  const activeCategoryType = ref<string | null>(null)

  function updateCategory(type: string, data: Partial<WorldCategory>) {
    if (projectStore.bundle) {
      const category = projectStore.bundle.worldview.categories.find(c => c.type === type)
      if (category) {
        Object.assign(category, data)
        projectStore.markDirty()
      }
    }
  }

  function addCategory(name: string, type: string) {
    if (projectStore.bundle) {
      projectStore.takeSnapshot() // 在修改前记录
      projectStore.bundle.worldview.categories.push({
        type,
        name,
        summary: '',
        details: []
      })
      projectStore.markDirty()
    }
  }

  function removeCategory(type: string) {
    if (projectStore.bundle) {
      const index = projectStore.bundle.worldview.categories.findIndex(c => c.type === type)
      if (index !== -1) {
        projectStore.takeSnapshot()
        projectStore.bundle.worldview.categories.splice(index, 1)
        projectStore.markDirty()
      }
    }
  }

  function moveCategory(type: string, direction: 'up' | 'down') {
    if (projectStore.bundle) {
      const index = projectStore.bundle.worldview.categories.findIndex(c => c.type === type)
      if (index === -1) return

      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= projectStore.bundle.worldview.categories.length) return

      projectStore.takeSnapshot()
      const [moved] = projectStore.bundle.worldview.categories.splice(index, 1)
      projectStore.bundle.worldview.categories.splice(newIndex, 0, moved)
      projectStore.markDirty()
    }
  }

  function addTimelineEvent(title: string = '新事件') {
    if (projectStore.bundle) {
      projectStore.takeSnapshot() // 在修改前记录
      const newEvent: WorldTimelineEvent = {
        id: uuidv4(),
        time: {
          label: '',
          order: projectStore.bundle.worldview.timeline.length
        },
        title,
        description: '',
        participants: [],
        impact: []
      }
      projectStore.bundle.worldview.timeline.push(newEvent)
      // 按 order 排序
      projectStore.bundle.worldview.timeline.sort((a, b) => a.time.order - b.time.order)
      projectStore.markDirty()
      return newEvent
    }
    return null
  }

  function removeTimelineEvent(id: string) {
    if (projectStore.bundle) {
      const index = projectStore.bundle.worldview.timeline.findIndex(e => e.id === id)
      if (index !== -1) {
        projectStore.takeSnapshot() // 在修改前记录
        projectStore.bundle.worldview.timeline.splice(index, 1)
        projectStore.markDirty()
      }
    }
  }

  function moveTimelineEvent(id: string, direction: 'up' | 'down') {
    if (projectStore.bundle) {
      const index = projectStore.bundle.worldview.timeline.findIndex(e => e.id === id)
      if (index === -1) return

      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= projectStore.bundle.worldview.timeline.length) return

      projectStore.takeSnapshot()
      // 交换位置并同步 order 属性
      const targetIndex = newIndex
      const [moved] = projectStore.bundle.worldview.timeline.splice(index, 1)
      projectStore.bundle.worldview.timeline.splice(targetIndex, 0, moved)
      
      // 更新所有事件的 order 属性以保持一致
      projectStore.bundle.worldview.timeline.forEach((event, i) => {
        event.time.order = i
      })
      
      projectStore.markDirty()
    }
  }

  function updateTimelineEvent(id: string, updates: Partial<WorldTimelineEvent>) {
    if (projectStore.bundle) {
      const index = projectStore.bundle.worldview.timeline.findIndex(e => e.id === id)
      if (index !== -1) {
        projectStore.bundle.worldview.timeline[index] = { 
          ...projectStore.bundle.worldview.timeline[index], 
          ...updates 
        }
        // 如果修改了顺序，重新排序
        if (updates.time?.order !== undefined) {
          projectStore.bundle.worldview.timeline.sort((a, b) => a.time.order - b.time.order)
        }
        projectStore.markDirty()
      }
    }
  }

  return {
    worldview,
    activeCategoryType,
    updateCategory,
    addCategory,
    removeCategory,
    moveCategory,
    addTimelineEvent,
    updateTimelineEvent,
    removeTimelineEvent,
    moveTimelineEvent
  }
})
