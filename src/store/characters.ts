import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useProjectStore } from './project'
import type { Character, Relationship, StoryPhase, CharacterBase, RelationshipData } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export const useCharacterStore = defineStore('characters', () => {
  const projectStore = useProjectStore()

  const activeCharacterId = ref<string | null>(null)
  const currentPhaseId = ref<string | null>(null) // 当前阶段ID (null为全局)

  // 监听项目切换，重置选中状态
  watch(() => projectStore.bundle?.project.id, () => {
    activeCharacterId.value = null
    currentPhaseId.value = null
  })

  const rawCharacters = computed(() => projectStore.bundle?.characters || [])
  const rawRelationships = computed(() => projectStore.bundle?.relationships || [])
  const phases = computed(() => projectStore.bundle?.phases || [])
  const graphLayout = computed(() => projectStore.bundle?.graphLayout || {})

  // 获取当前阶段所有角色 (包含覆盖数据)
  const charactersInPhase = computed(() => {
    if (!projectStore.bundle) return []
    const phaseId = currentPhaseId.value

    return rawCharacters.value.map(char => {
      // 1. 基础数据
      let effectiveBase = { ...char.base }

      // 2. 合并当前阶段覆盖
      if (phaseId && char.overrides && char.overrides[phaseId]) {
        effectiveBase = { ...effectiveBase, ...char.overrides[phaseId] }
      }

      return {
        id: char.id,
        projectId: char.projectId,
        type: char.type,
        notes: char.notes, // 直通属性
        ...effectiveBase,  // 展开基础数据
        _original: char    // 原始引用
      }
    })
  })

  // 获取当前阶段所有关系 (包含覆盖数据，不过滤非活跃状态)
  const allRelationshipsInPhase = computed(() => {
    if (!projectStore.bundle) return []
    const phaseId = currentPhaseId.value

    return rawRelationships.value.map(rel => {
      // 1. 基础数据
      let effectiveData: RelationshipData = {
        type: rel.type,
        label: rel.label,
        strength: rel.strength,
        direction: rel.direction,
        notes: rel.notes,
        isActive: rel.isActive ?? true // 默认活跃
      }

      // 2. 合并当前阶段覆盖
      if (phaseId && rel.overrides && rel.overrides[phaseId]) {
        effectiveData = { ...effectiveData, ...rel.overrides[phaseId] }
      }

      return {
        id: rel.id,
        sourceId: rel.sourceId,
        targetId: rel.targetId,
        overrides: rel.overrides, // 保留原始覆盖数据
        ...effectiveData,
        _original: rel
      }
    })
  })

  // 获取当前阶段所有关系 (仅返回活跃状态)
  const relationshipsInPhase = computed(() => {
    return allRelationshipsInPhase.value.filter(r => r.isActive !== false)
  })

  // 设置当前选中阶段
  function setCurrentPhase(phaseId: string | null) {
    currentPhaseId.value = phaseId
  }

  // 添加新阶段
  function addPhase(label: string = '新阶段') {
    if (!projectStore.bundle) return null
    if (!projectStore.bundle.phases) projectStore.bundle.phases = []

    projectStore.takeSnapshot()
    const newPhase: StoryPhase = {
      id: uuidv4(),
      label,
      order: projectStore.bundle.phases.length,
      description: ''
    }
    projectStore.bundle.phases.push(newPhase)
    projectStore.markDirty()
    return newPhase
  }
  
  function updatePhase(id: string, updates: Partial<StoryPhase>) {
    if (!projectStore.bundle?.phases) return
    const phase = projectStore.bundle.phases.find(p => p.id === id)
    if (phase) {
      projectStore.takeSnapshot()
      Object.assign(phase, updates)
      projectStore.markDirty()
    }
  }

  // 删除阶段及关联覆盖
  function deletePhase(id: string) {
    if (!projectStore.bundle?.phases) return
    const idx = projectStore.bundle.phases.findIndex(p => p.id === id)
    if (idx !== -1) {
      projectStore.takeSnapshot()
      projectStore.bundle.phases.splice(idx, 1)
      
      // 清理角色阶段覆盖
      projectStore.bundle.characters.forEach(c => {
        if (c.overrides && c.overrides[id]) {
          delete c.overrides[id]
        }
      })
      // 清理关系阶段覆盖
      projectStore.bundle.relationships.forEach(r => {
        if (r.overrides && r.overrides[id]) {
          delete r.overrides[id]
        }
      })
      
      if (currentPhaseId.value === id) currentPhaseId.value = null
      projectStore.markDirty()
    }
  }

  // 移动阶段顺序
  function movePhase(id: string, direction: 'up' | 'down') {
    if (!projectStore.bundle?.phases) return
    const phases = projectStore.bundle.phases
    const index = phases.findIndex(p => p.id === id)
    if (index === -1) return

    if (direction === 'up' && index > 0) {
      projectStore.takeSnapshot()
      // 交换数组位置
      const temp = phases[index]
      phases[index] = phases[index - 1]
      phases[index - 1] = temp
      
      // 交换order属性 (假设order与索引强相关，或者是排序依据)
      const tempOrder = phases[index].order
      phases[index].order = phases[index - 1].order
      phases[index - 1].order = tempOrder
      
      projectStore.markDirty()
    } else if (direction === 'down' && index < phases.length - 1) {
      projectStore.takeSnapshot()
      // 交换数组位置
      const temp = phases[index]
      phases[index] = phases[index + 1]
      phases[index + 1] = temp

      // 交换order属性
      const tempOrder = phases[index].order
      phases[index].order = phases[index + 1].order
      phases[index + 1].order = tempOrder
      
      projectStore.markDirty()
    }
  }

  // --- 角色操作 ---

  function addCharacter(name: string = '新角色') {
    if (projectStore.bundle) {
      projectStore.takeSnapshot()
      const newCharacter: Character = {
        id: uuidv4(),
        projectId: projectStore.bundle.project.id,
        type: 'character',
        base: {
          name,
          aliases: [],
          factions: [],
          identities: [],
          appearance: '',
          personality: '',
          background: '',
          tags: []
        },
        overrides: {},
        notes: {
          authorNotes: '',
          openQuestions: ''
        }
      }
      projectStore.bundle.characters.push(newCharacter)
      projectStore.markDirty()
      return newCharacter
    }
    return null
  }

  function updateCharacterBase(id: string, updates: Partial<CharacterBase>) {
    if (!projectStore.bundle) return
    const char = projectStore.bundle.characters.find(c => c.id === id)
    if (char) {
      projectStore.takeSnapshot()
      Object.assign(char.base, updates)
      projectStore.markDirty()
    }
  }

  // 更新角色阶段覆盖
  function updateCharacterOverride(charId: string, phaseId: string, updates: Partial<CharacterBase>) {
    if (!projectStore.bundle) return
    const char = projectStore.bundle.characters.find(c => c.id === charId)
    if (char) {
      projectStore.takeSnapshot()
      if (!char.overrides) char.overrides = {}
      if (!char.overrides[phaseId]) char.overrides[phaseId] = {}
      
      const override = char.overrides[phaseId]
      Object.assign(override, updates)

      // 清理冗余覆盖
      const keys = Object.keys(override) as (keyof CharacterBase)[]
      keys.forEach(key => {
        const baseValue = char.base[key]
        const overrideValue = override[key]

        if (JSON.stringify(baseValue) === JSON.stringify(overrideValue)) {
          delete override[key]
        }
      })
      
      if (Object.keys(override).length === 0) {
        delete char.overrides[phaseId]
      }

      projectStore.markDirty()
    }
  }

  // 删除角色及相关关系
  function removeCharacter(id: string) {
    if (!projectStore.bundle) return
    const index = projectStore.bundle.characters.findIndex(c => c.id === id)
    if (index !== -1) {
      projectStore.takeSnapshot()
      
      // 清理关联关系
      if (projectStore.bundle.relationships) {
          const toRemove = projectStore.bundle.relationships
              .filter(r => r.sourceId === id || r.targetId === id)
              .map(r => r.id)
          
          toRemove.forEach(relId => {
              const rIndex = projectStore.bundle.relationships.findIndex(r => r.id === relId)
              if (rIndex !== -1) projectStore.bundle.relationships.splice(rIndex, 1)
          })
      }
      
      projectStore.bundle.characters.splice(index, 1)
      projectStore.markDirty()
    }
  }

  // --- 关系操作 ---

  // 添加关系 (默认活跃)
  function addRelationship(sourceId: string, targetId: string, type: string = 'custom', initialActive = true) {
    if (!projectStore.bundle) return null
    if (!projectStore.bundle.relationships) projectStore.bundle.relationships = []
    
    projectStore.takeSnapshot()
    const newRel: Relationship = {
      id: uuidv4(),
      sourceId,
      targetId,
      type,
      label: '新关系',
      strength: 50,
      direction: 'directed',
      isActive: initialActive,
      overrides: {}
    }
    
    projectStore.bundle.relationships.push(newRel)
    projectStore.markDirty()
    return newRel
  }

  // 更新关系基础数据
  function updateRelationshipBase(id: string, updates: Partial<RelationshipData>) {
    if (!projectStore.bundle?.relationships) return
    const rel = projectStore.bundle.relationships.find(r => r.id === id)
    if (rel) {
      projectStore.takeSnapshot()
      Object.assign(rel, updates)
      projectStore.markDirty()
    }
  }

  // 更新关系阶段覆盖 (自动清理冗余)
  function updateRelationshipOverride(relId: string, phaseId: string, updates: Partial<RelationshipData>) {
    if (!projectStore.bundle?.relationships) return
    const rel = projectStore.bundle.relationships.find(r => r.id === relId)
    if (rel) {
      projectStore.takeSnapshot()
      if (!rel.overrides) rel.overrides = {}
      if (!rel.overrides[phaseId]) rel.overrides[phaseId] = {}
      
      const override = rel.overrides[phaseId]
      
      // 更新字段
      Object.assign(override, updates)

      // 清理冗余覆盖
      const keys = Object.keys(override) as (keyof RelationshipData)[]
      keys.forEach(key => {
        const baseValue = rel[key] // 获取基础值
        const overrideValue = override[key]

        // 活跃状态特殊处理 (默认 true)
        if (key === 'isActive') {
           const normBase = rel.isActive ?? true
           const normOverride = override.isActive
           if (normBase === normOverride) {
             delete override[key]
           }
        } else if (baseValue === overrideValue) {
           delete override[key]
        }
      })

      // 若覆盖对象为空则删除
      if (Object.keys(override).length === 0) {
        delete rel.overrides[phaseId]
      }
      
      projectStore.markDirty()
    }
  }

  function removeRelationship(id: string) {
    if (!projectStore.bundle?.relationships) return false
    const idx = projectStore.bundle.relationships.findIndex(r => r.id === id)
    if (idx !== -1) {
      projectStore.takeSnapshot()
      projectStore.bundle.relationships.splice(idx, 1)
      projectStore.markDirty()
      return true
    }
    return false
  }

  function updateCharacterPosition(id: string, x: number, y: number) {
    if (!projectStore.bundle) return
    if (!projectStore.bundle.graphLayout) projectStore.bundle.graphLayout = {}
    projectStore.bundle.graphLayout[id] = { x, y }
    projectStore.markDirty()
  }

  // --- 辅助方法 ---
  const allUsedTags = computed(() => {
    const tags = new Set<string>()
    rawCharacters.value.forEach(char => {
      if (char.base.tags) {
        char.base.tags.forEach(t => tags.add(t))
      }
    })
    return Array.from(tags).filter(t => !!t)
  })

  // 智能更新角色 (根据当前阶段)
  function smartUpdateCharacter(id: string, updates: Partial<CharacterBase>) {
    if (currentPhaseId.value) {
      updateCharacterOverride(id, currentPhaseId.value, updates)
    } else {
      updateCharacterBase(id, updates)
    }
  }

  function smartUpdateRelationship(id: string, updates: Partial<RelationshipData>) {
    if (currentPhaseId.value) {
      updateRelationshipOverride(id, currentPhaseId.value, updates)
    } else {
      updateRelationshipBase(id, updates)
    }
  }

  function getRelationshipDeleteMode(relId: string): 'logical' | 'physical' {
    if (!currentPhaseId.value) return 'physical'

    const rel = allRelationshipsInPhase.value.find(r => r.id === relId)
    if (!rel) return 'physical'

    // 临时关系删除
    const isTemporary = rel._original?.isActive === false && rel.overrides?.[currentPhaseId.value]?.isActive === true
    
    if (isTemporary) return 'physical'
    
    // 基础关系逻辑隐藏
    return 'logical'
  }

  return {
    // 状态
    activeCharacterId,
    currentPhaseId,
    
    rawCharacters,
    charactersInPhase,
    rawRelationships,
    relationshipsInPhase,
    allRelationshipsInPhase,
    phases,
    graphLayout,
    allUsedTags,

    setCurrentPhase,
    addPhase,
    updatePhase,
    deletePhase,
    movePhase,
    
    addCharacter,
    removeCharacter,
    updateCharacterBase,
    updateCharacterOverride,
    smartUpdateCharacter,
    
    addRelationship,
    removeRelationship,
    updateRelationshipBase,
    updateRelationshipOverride,
    smartUpdateRelationship,
    getRelationshipDeleteMode,
    
    updateCharacterPosition
  }
})
