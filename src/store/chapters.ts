import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useProjectStore } from './project'
import type { Chapter, RecognitionRules } from '@/types'
import { ChapterParser } from '@/core/chapter-parser'

export const DEFAULT_RECOGNITION_RULES: RecognitionRules = {
  patterns: {
    volume: [
      '^第\\s*(\\d+|[一二三四五六七八九十百千万]+)\\s*[卷部]',
      '^[卷部]\\s*(\\d+|[一二三四五六七八九十百千万]+)',
      '^Volume\\s*\\d+',
      '^正文$'
    ],
    chapter: [
      '^第\\s*(\\d+|[一二三四五六七八九十百千万零〇]+)\\s*[章回节]',
      '^(\\d+|[一二三四五六七八九十百千万零〇]+)\\s*[章回节]',
      '^Chapter\\s*\\d+',
      '^\\d+\\s*[\\.、\\s]',
      '^【\\s*第?\\s*(\\d+|[一二三四五六七八九十百千万零〇]+)\\s*[章回节]\\s*】'
    ],
    special: [
      '^(番外|外传|后日谈|IF线|平行世界|前言|序言|自序|后记|跋|感言|小剧场|特别篇|特典)',
      '^[·:：\\s]?(番外|外传|后日谈|IF线|平行世界|小剧场|特别篇|特典)[·:：\\s]?.+'
    ]
  },
  structuralAnchors: {
    maxLength: 40,
    requireEmptyLineAround: true
  },
  negativeRules: {
    enabled: true,
    excludePunctuationEnd: true,
    excludeDialogueStart: true,
    maxPunctuationCount: 4
  }
}

export const useChapterStore = defineStore('chapters', () => {
  const projectStore = useProjectStore()

  // 识别规则 (仅会话生效，不持久化)
  const recognitionRules = ref<RecognitionRules>(JSON.parse(JSON.stringify(DEFAULT_RECOGNITION_RULES)))

  /**
   * 恢复默认识别规则
   */
  function resetRecognitionRules() {
    recognitionRules.value = JSON.parse(JSON.stringify(DEFAULT_RECOGNITION_RULES))
  }

  /**
   * 核心逻辑：将扁平的章节列表（存储在 Bundle 中）转换成树状结构 (规范 6.1)
   */
  const chapters = computed(() => {
    if (!projectStore.bundle?.chapters) return []
    
    // 按物理行号排序，确保树形结构的顺序正确
    const sorted = [...projectStore.bundle.chapters].sort((a, b) => a.anchorLineNumber - b.anchorLineNumber)
    
    const tree: Chapter[] = []
    const stack: { depth: number, children: Chapter[] }[] = []

    sorted.forEach(node => {
      const item: Chapter = { ...node, children: [] }
      
      while (stack.length > 0 && stack[stack.length - 1].depth >= item.depth) {
        stack.pop()
      }

      if (stack.length === 0) {
        tree.push(item)
      } else {
        stack[stack.length - 1].children.push(item)
      }
      stack.push({ depth: item.depth, children: item.children })
    })
    
    return tree
  })

  /**
   * 直接访问原始扁平列表（Source of Truth）
   */
  const flattenedChapters = computed(() => {
    return projectStore.bundle?.chapters || []
  })

  const manuscriptContent = computed({
    get: () => projectStore.bundle?.manuscript.content.join('\n') || '',
    set: (val: string) => {
      if (projectStore.bundle) {
        projectStore.bundle.manuscript.content = val.split(/\r?\n/)
        projectStore.bundle.manuscript.lastUpdated = new Date().toISOString()
        projectStore.markDirty()
      }
    }
  })

  /**
   * 内部方法：保持底层扁平列表的物理排序同步
   */
  function sortSourceOfTruth() {
    if (projectStore.bundle?.chapters) {
      projectStore.bundle.chapters.sort((a, b) => a.anchorLineNumber - b.anchorLineNumber)
    }
  }

  /**
   * 注册一个新的章节元数据
   */
  function registerChapterMetadata(id: string, title: string, lineNumber: number) {
    if (!projectStore.bundle) return

    // 校验：防止同一行重复绑定
    if (projectStore.bundle.chapters.some(c => c.anchorLineNumber === lineNumber)) {
      return null
    }

    projectStore.takeSnapshot()
    const newChapter: Chapter = {
      id,
      projectId: projectStore.bundle.project.id,
      depth: 0, 
      type: 'chapter',
      anchorLineNumber: lineNumber,
      anchorText: title,
      title: title,
      tags: [],
      collapsed: false,
      children: [],
      linkedOutlineActId: null
    }

    projectStore.bundle.chapters.push(newChapter)
    sortSourceOfTruth() // 立即重新排序底层数据
    projectStore.markDirty()
    return newChapter
  }

  function updateChapter(id: string, updates: Partial<Chapter>) {
    const chapter = projectStore.bundle?.chapters.find(c => c.id === id)
    if (chapter) {
      const needsReorder = updates.anchorLineNumber !== undefined && updates.anchorLineNumber !== chapter.anchorLineNumber
      Object.assign(chapter, updates)
      if (needsReorder) {
        sortSourceOfTruth()
      }
      projectStore.markDirty()
    }
  }

  function toggleChapterCollapse(id: string) {
    const chapter = projectStore.bundle?.chapters.find(c => c.id === id)
    if (chapter) {
      chapter.collapsed = !chapter.collapsed
      projectStore.markDirty()
    }
  }

  function removeChapter(id: string) {
    if (projectStore.bundle) {
      const index = projectStore.bundle.chapters.findIndex(c => c.id === id)
      if (index !== -1) {
        projectStore.takeSnapshot() // 在修改前记录
        projectStore.bundle.chapters.splice(index, 1)
        projectStore.markDirty()
      }
    }
  }

  /**
   * 目录自动识别
   */
  function reparseChapters() {
    if (!projectStore.bundle) return

    const lines = projectStore.bundle.manuscript.content
    const flatNodes = ChapterParser.detectChapters(lines, recognitionRules.value)

    projectStore.takeSnapshot()

    // 转换为 Bundle 格式的扁平列表
    const mappedChapters: Chapter[] = flatNodes.map(node => ({
      id: node.id,
      projectId: projectStore.bundle!.project.id,
      depth: ChapterParser.getTypeLevel(node.type) - 1, // 假设 level 1 是 depth 0
      type: node.type,
      anchorLineNumber: node.startLine + 1, // 1-indexed
      anchorText: node.title,
      title: node.title,
      tags: [],
      collapsed: false,
      children: [],
      linkedOutlineActId: null
    }))

    projectStore.bundle.chapters = mappedChapters
    projectStore.markDirty()
  }

  return {
    chapters,
    flattenedChapters,
    manuscriptContent,
    recognitionRules,
    resetRecognitionRules,
    registerChapterMetadata,
    updateChapter,
    toggleChapterCollapse,
    removeChapter,
    reparseChapters
  }
})
