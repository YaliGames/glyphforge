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

// --- Global Story Phase (全局剧情阶段) ---
export interface StoryPhase {
  id: string;
  label: string;
  order: number;
  description?: string;
  color?: string; // 可选：用于UI区分不同阶段的色调
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

export type RelationDirection = 'directed' | 'undirected' | 'bidirectional';

// 关系的可覆盖属性
export interface RelationshipData {
  type: string;         // 关系类型 Key
  label: string;        // 显示文本
  strength: number;     // 关系强度 (-100 ~ 100)
  direction: RelationDirection; 
  notes?: string;
  isActive?: boolean;   // 是否在该阶段有效/存在
}

export interface Relationship extends RelationshipData {
  id: string;
  sourceId: string;     // 源角色 ID
  targetId: string;     // 目标角色 ID
  
  // 阶段覆盖: Key 是 StoryPhase.id
  overrides?: Record<string, Partial<RelationshipData>>; 
}

export interface Character {
  id: string
  projectId: string
  type: 'character'
  
  base: CharacterBase
  
  // 阶段覆盖: Key 是 StoryPhase.id
  // 存储该角色在特定阶段的属性变化 (增量覆盖)
  overrides: Record<string, Partial<CharacterBase>>
  
  notes: {
    authorNotes: string
    openQuestions: string
  }
}
