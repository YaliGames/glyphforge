import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useProjectStore } from './project'
import type { OutlineAct, ActRange } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export const useOutlineStore = defineStore('outline', () => {
  const projectStore = useProjectStore()

  const outline = computed(() => projectStore.bundle?.outline || null)
  const acts = computed(() => outline.value?.structure.acts || [])
  const narrative = computed(() => outline.value?.narrative)
  const content = computed(() => outline.value?.content || [])

  /**
   * 应用行级别的增量更新。
   * 采用坐标投影算法，处理增删、合并行等复杂场景，确保大纲范围的结构稳定性。
   */
  function applyLineDelta(
    changeStartLine: number,
    changeEndLine: number,
    linesDiff: number
  ) {
    if (!projectStore.bundle) return
    const currentActs = projectStore.bundle.outline.structure.acts

    currentActs.forEach(act => {
      if (!act.range) return
      const oldStart = act.range.startLine
      const oldEnd = act.range.endLine

      // --- 核心逻辑：基于“坐标平移”与“边界稳定性”优先的投影算法 ---

      // 1. 解绑判定：必须同时满足以下两个条件
      //    a. 变更范围【完全覆盖】了 Act (changeStart <= oldStart && changeEnd >= oldEnd)
      //    b. 变更导致的行数减少量 >= Act 的高度 (说明 Act 内的所有行都被销毁了)
      if (linesDiff < 0) {
        const isFullCover = changeStartLine <= oldStart && changeEndLine >= oldEnd
        // actHeight 是该幕占据的物理行数
        const actHeight = oldEnd - oldStart + 1
        // 注意 linesDiff 是负数，所以我们要比较其绝对值是否足够大
        // 例如：Act 高度 2 行，linesDiff 为 -1 (Merge)，则不解绑
        //      Act 高度 2 行，linesDiff 为 -2 (Delete 2 lines)，则解绑
        //      Act 高度 1 行，linesDiff 为 -1，则解绑
        if (isFullCover && linesDiff <= -actHeight) {
          act.range = undefined
          return
        }
      }

      // 2. 起始行投影
      let newStart = oldStart
      if (changeEndLine < oldStart) {
        // 变动点在起始行【上方】（不包含起始行本身）
        newStart = oldStart + linesDiff
      } 
      // 策略：如果变动点【包含】起始行，起始行锚定在 changeStartLine，
      // 但由于 changeStartLine 往往就是变动后的新位置，所以这里通常不需要额外操作，
      // 保持 newStart = oldStart 在逻辑上通常就对应了“原位置的替补”。
      // 除非这导致了 start > end，那会在后面修复。

      // 3. 结束行投影
      let newEnd = oldEnd
      if (changeEndLine < oldEnd) {
        // 变动点在结束行【上方】（不包含结束行）
        newEnd = oldEnd + linesDiff
      } else if (changeStartLine <= oldEnd) {
        // 变动点【覆盖或触及】了结束行
        if (changeStartLine === oldEnd && linesDiff < 0) {
          // 特殊场景保护：Backspace 在 Act 的最后一行将下一行合并上来
          // Range 为 [oldEnd, max] -> [oldEnd + 1, 1]。
          // 此时不应让 End 上移，因为内容只是追加到了末尾。
          newEnd = oldEnd
        } else {
          // 其他情况：收缩
          // 确保 End 至少不小于 Start (但这里的 Start 是旧的，稍后会统一最大化)
          // 这里的 Math.max(changeStartLine, ...) 是防止 End 跑到变动区域上方去
          newEnd = Math.max(changeStartLine, oldEnd + linesDiff)
        }
      }

      // 4. 更新范围并执行越界修正
      act.range.startLine = Math.max(1, newStart)
      act.range.endLine = Math.max(act.range.startLine, newEnd)
    })

    projectStore.markDirty()
  }

  function updateNarrativeSummary(val: string) {
    if (projectStore.bundle) {
      projectStore.bundle.outline.content = val.split(/\r?\n/)
      projectStore.markDirty()
    }
  }

  /**
   * 内部方法：保持大纲幕顺序根据行号同步
   */
  function sortActsSourceOfTruth() {
    if (projectStore.bundle?.outline.structure.acts) {
      projectStore.bundle.outline.structure.acts.sort((a, b) => {
        const hasA = a.range && typeof a.range.startLine === 'number'
        const hasB = b.range && typeof b.range.startLine === 'number'
        if (hasA && hasB) return a.range!.startLine - b.range!.startLine
        if (hasA) return -1
        if (hasB) return 1
        return 0
      })
    }
  }

  function createAct(title = '未命名幕', range?: ActRange) {
    if (!projectStore.bundle) return null
    
    // 结构化变更，在操作前记录快照（以便撤销回到操作前）
    projectStore.takeSnapshot()
    
    const id = uuidv4()
    
    if (range) {
      projectStore.bundle.outline.structure.acts.forEach(a => {
        if (a.range) {
          if (range.startLine <= a.range.endLine && range.endLine >= a.range.startLine) {
            a.range = undefined
          }
        }
      })
    }

    const newAct: OutlineAct = {
      id,
      title,
      purpose: '',
      range,
      linkedChapters: []
    }
    projectStore.bundle.outline.structure.acts.push(newAct)
    sortActsSourceOfTruth() // 立即重新排序
    projectStore.markDirty()
    // 移除操作后的二次快照
    return newAct
  }

  function bindAct(id: string, range: ActRange) {
    if (!projectStore.bundle) return
    
    projectStore.takeSnapshot()
    
    const actsList = projectStore.bundle.outline.structure.acts
    
    actsList.forEach(a => {
      if (a.id !== id && a.range) {
        if (range.startLine <= a.range.endLine && range.endLine >= a.range.startLine) {
          a.range = undefined
        }
      }
    })

    const target = actsList.find(a => a.id === id)
    if (target) {
      target.range = { ...range }
      sortActsSourceOfTruth() // 绑定后立即重排
      projectStore.markDirty()
      // 移除操作后的二次快照
    }
  }

  function unbindAct(id: string) {
    if (!projectStore.bundle) return
    projectStore.takeSnapshot()
    const target = projectStore.bundle.outline.structure.acts.find(a => a.id === id)
    if (target) {
      target.range = undefined
      projectStore.markDirty()
      // 移除操作后的二次快照
    }
  }

  function updateActMetadata(id: string, updates: Partial<{ title: string; purpose: string; linkedChapters: string[]; range: ActRange }>) {
    if (!projectStore.bundle) return
    const target = projectStore.bundle.outline.structure.acts.find(a => a.id === id)
    if (target) {
      Object.assign(target, updates)
      projectStore.markDirty()
    }
  }

  function removeAct(id: string) {
    if (!projectStore.bundle) return
    projectStore.takeSnapshot()
    const index = projectStore.bundle.outline.structure.acts.findIndex(a => a.id === id)
    if (index !== -1) {
      projectStore.bundle.outline.structure.acts.splice(index, 1)
      projectStore.markDirty()
      // 移除操作后的二次快照
    }
  }

  return {
    outline,
    acts,
    narrative,
    content,
    updateNarrativeSummary,
    applyLineDelta,
    createAct,
    bindAct,
    unbindAct,
    removeAct,
    updateActMetadata
  }
})
