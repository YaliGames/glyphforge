/**
 * 世界观与角色实体相关定义
 */

export interface WorldCategory {
  type: string
  name: string
  summary: string
  details: string[] // 列表形式，支持细分点
}

export interface WorldTimelineEvent {
  id: string
  time: {
    label: string
    order: number
  }
  title: string
  description: string
  participants: string[] // Entity IDs
  impact: string[]       // Category types
}

export interface Worldview {
  id: string
  projectId: string
  type: 'world'
  categories: WorldCategory[]
  timeline: WorldTimelineEvent[]
}

// --- Character (角色) ---
export interface CharacterBase {
  name: string          // 角色姓名
  aliases: string[]     // 角色昵称 / 别名
  factions: string[]    // 角色阵营
  identities: string[]  // 角色身份 / 头衔
  appearance: string    // 外貌着装
  personality: string   // 性格特征
  background: string    // 身份背景
  tags: string[]        // 角色标签
}

export interface CharacterPhase {
  id: string
  label: string
  overrides: Partial<CharacterBase> & {
    relations?: CharacterRelation[]
  }
  summary: string
}

export interface CharacterRelation {
  id: string
  targetId: string      // 目标角色 ID
  type: string          // 关系类型 (如：宿敌)
  notes: string         // 备注 / 详情
}

export interface Character {
  id: string
  projectId: string
  type: 'character'
  base: CharacterBase
  phases: CharacterPhase[]
  relations: CharacterRelation[] // 基础关系 (全局生效，除非被阶段覆盖)
  notes: {
    authorNotes: string
    openQuestions: string
  }
}
