import { Worldview, Character } from './entities'
import { Outline, Chapter, AuthorNote } from './content'

/**
 * 全局操作指令类型
 */
export type AppAction = 
  | 'new-project'
  | 'open-project' 
  | 'import-txt'
  | 'save' 
  | 'save-as'
  | 'undo'
  | 'redo'
  | 'find'
  | 'replace'
  | 'goto-welcome'
  | 'goto-outline'
  | 'goto-editor'
  | 'goto-characters'
  | 'goto-worldview'
  | 'goto-timeline'
  | 'settings'
  | 'theme-dark'
  | 'theme-light'
  | 'theme-system'
  | 'toggle-fullscreen'
  | 'dev-tools'
  | 'process-explorer'
  | 'license'
  | 'privacy-policy'
  | 'check-updates'
  | 'report-issue'
  | 'open-settings'
  | 'open-ai-profiles'
  | 'about'
  | 'build-info'
  | 'exit';

/**
 * 视图与编辑模式
 */
export type ViewMode = 'source' | 'preview' | 'diff' | 'split'
export type EditMode = 'edit' | 'read'

/**
 * GlyphForge V1 核心数据模型 (项目级)
 */

export interface GlyphForgeHierarchy {
  depth: number
  name: string
}

export interface GlyphForgeProject {
  id: string
  title: string
  description: string
  createdAt: string // ISODate
  updatedAt: string // ISODate
  path?: string    // 本地项目路径
  hierarchies?: GlyphForgeHierarchy[] // 层级配置 (depth 0 是最高层)
}

export interface Manuscript {
  content: string[] // 分行存储的文本内容
  lastUpdated: string
}

// --- Project File Structure (单文件数据结构) ---
export interface GlyphForgeBundle {
  version: string        // Schema 版本号，如 "1.0"
  project: GlyphForgeProject
  manuscript: Manuscript // 正文手稿 (V1 统一大文件模式)
  worldview: Worldview
  outline: Outline
  characters: Character[]
  chapters: Chapter[]    // 章节树 (V1 标题映射模式)
  authorNotes: AuthorNote[]
  settings: {
    lastOpenedSceneId?: string
    [key: string]: any
  }
}
