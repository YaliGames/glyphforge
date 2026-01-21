import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useProjectStore } from './project'
import type { Character, CharacterPhase, CharacterRelation } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export const useCharacterStore = defineStore('characters', () => {
  const projectStore = useProjectStore()

  const characters = computed(() => projectStore.bundle?.characters || [])
  const activeCharacterId = ref<string | null>(null)

  function addCharacter(name: string = '新角色') {
    if (projectStore.bundle) {
      projectStore.takeSnapshot() // 在修改前记录
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
        phases: [],
        relations: [],
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

  function addPhase(characterId: string, label: string = '新阶段') {
    if (projectStore.bundle) {
      const character = projectStore.bundle.characters.find(c => c.id === characterId)
      if (character) {
        projectStore.takeSnapshot() // 在修改前记录
        const newPhase: CharacterPhase = {
          id: uuidv4(),
          label,
          overrides: {},
          summary: ''
        }
        character.phases.push(newPhase)
        projectStore.markDirty()
        return newPhase
      }
    }
    return null
  }

  function removePhase(characterId: string, phaseId: string) {
    if (projectStore.bundle) {
      const character = projectStore.bundle.characters.find(c => c.id === characterId)
      if (character) {
        const idx = character.phases.findIndex(p => p.id === phaseId)
        if (idx !== -1) {
          projectStore.takeSnapshot() // 在修改前记录
          character.phases.splice(idx, 1)
          projectStore.markDirty()
          return true
        }
      }
    }
    return false
  }

  function addRelation(characterId: string, targetId: string = '') {
    if (projectStore.bundle) {
      const character = projectStore.bundle.characters.find(c => c.id === characterId)
      if (character) {
        projectStore.takeSnapshot() // 在修改前记录
        const newRelation: CharacterRelation = {
          id: uuidv4(),
          targetId,
          type: '',
          notes: ''
        }
        character.relations.push(newRelation)
        projectStore.markDirty()
        return newRelation
      }
    }
    return null
  }

  function removeRelation(characterId: string, relId: string) {
    if (projectStore.bundle) {
      const character = projectStore.bundle.characters.find(c => c.id === characterId)
      if (character) {
        const idx = character.relations.findIndex(r => r.id === relId)
        if (idx !== -1) {
          projectStore.takeSnapshot() // 在修改前记录
          character.relations.splice(idx, 1)
          projectStore.markDirty()
          return true
        }
      }
    }
    return false
  }

  function updateCharacter(id: string, updates: Partial<Character>) {
    if (projectStore.bundle) {
      const index = projectStore.bundle.characters.findIndex(c => c.id === id)
      if (index !== -1) {
        projectStore.bundle.characters[index] = { ...projectStore.bundle.characters[index], ...updates }
        projectStore.markDirty()
      }
    }
  }

  function removeCharacter(id: string) {
    if (projectStore.bundle) {
      const index = projectStore.bundle.characters.findIndex(c => c.id === id)
      if (index !== -1) {
        projectStore.takeSnapshot() // 在修改前记录
        projectStore.bundle.characters.splice(index, 1)
        projectStore.markDirty()
      }
    }
  }

  function moveCharacter(id: string, direction: 'up' | 'down') {
    if (projectStore.bundle) {
      const index = projectStore.bundle.characters.findIndex(c => c.id === id)
      if (index === -1) return

      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= projectStore.bundle.characters.length) return

      projectStore.takeSnapshot() // 记录快照
      const [moved] = projectStore.bundle.characters.splice(index, 1)
      projectStore.bundle.characters.splice(newIndex, 0, moved)
      projectStore.markDirty()
    }
  }

  /**
   * 获取角色的生效数据 (Base + Phase Overrides)
   * 目前已移除自动绑定逻辑，默认返回基础属性
   */
  function getEffectiveCharacter(characterId: string, _currentChapterId: string | null = null) {
    const character = characters.value.find(c => c.id === characterId)
    if (!character) return null

    return { 
      ...character.base, 
      relations: character.relations 
    }
  }

  /**
   * 获取项目中所有已使用的标签 (用于自动补全)
   */
  const allUsedTags = computed(() => {
    const tags = new Set<string>()
    characters.value.forEach(char => {
      if (char.base.tags) {
        char.base.tags.forEach(t => tags.add(t))
      }
    })
    return Array.from(tags).filter(t => !!t)
  })

  return {
    characters,
    activeCharacterId,
    allUsedTags,
    addCharacter,
    addPhase,
    removePhase,
    addRelation,
    removeRelation,
    updateCharacter,
    removeCharacter,
    moveCharacter,
    getEffectiveCharacter
  }
})
