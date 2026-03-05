/**
 * 创作内容相关定义 (大纲, 章节, 笔记)
 */

// --- Outline (大纲) ---
export type ActStatus = 'Unbound' | 'Bound' | 'Active'

export interface ActRange {
  startLine: number; // 1-indexed
  endLine: number;   // 1-indexed
}

export interface OutlineAct {
  id: string
  title: string
  purpose: string
  range?: ActRange
  linkedChapters: string[] // Chapter IDs
}

export interface Outline {
  id: string
  projectId: string
  content: string[] // 分行存储的文本内容
  narrative: {
    notes: string
  }
  structure: {
    acts: OutlineAct[]
    dependencies: string[]
  }
}

export interface Chapter {
  id: string
  projectId: string
  depth: number              // 树深度，0: 顶层
  anchorLineNumber: number   // 标题行起始行号 (1-indexed)
  anchorText: string         // 校验文本内容 (用于恢复锚点)
  title: string              // 双向绑定正文内容
  displayName?: string       // 导出/显示用占位名
  tags: string[]             // 章节标签 (用于判定角色阶段, 规范 2.3.2)
  collapsed: boolean         // UI 折叠状态
  children: Chapter[]        // 子章节
  linkedOutlineActId: string | null
}

/**
 * 目录识别规则
 */
export interface RecognitionRules {
  patterns: {
    hierarchies: Record<number, string[]>
  }
  structuralAnchors: {
    maxLength: number
    requireEmptyLineAround: boolean
  }
  negativeRules: {
    enabled: boolean
    excludePunctuationEnd: boolean
    excludeDialogueStart: boolean
    maxPunctuationCount: number
  }
}

/**
 * 识别过程中产生的临时节点 (Parser 内部使用)
 */
export interface ChapterNode {
  id: string
  title: string
  originalTitle: string
  depth: number
  startLine: number
  endLine: number
  children: ChapterNode[]
}

// --- AuthorNote (作者注释) ---
export type AuthorNoteScope = 'global' | 'outline' | 'character' | 'chapter'

export interface AuthorNote {
  id: string
  projectId: string
  content: string
  scope: AuthorNoteScope
  targetId: string // ID of the related entity
}
