<template>
  <div class="flex-1 flex overflow-hidden bg-white dark:bg-[#1e1e1e]">
    <!-- 角色列表 -->
    <SidePanel title="角色库" width="w-64" side="left">
      <template #actions>
        <IconButton icon="fa-solid fa-plus" title="新建角色" size="sm" variant="primary" @click="addCharacter" />
      </template>

      <div class="p-2 space-y-2">
        <Input v-model="searchQuery" icon-prefix="fa-solid fa-search" placeholder="搜索姓名 / 标签..." />

        <div class="space-y-1 mt-2">
          <div v-for="char in filteredCharacters" :key="char.id" @click="activeCharacterId = char.id" :class="[
            'group p-2 rounded-lg cursor-pointer transition-all duration-200 relative hover:translate-x-0.5 border border-transparent',
            activeCharacterId === char.id
              ? 'bg-blue-50 dark:bg-[#37373d] text-blue-600 dark:text-blue-400 shadow-sm border-gray-200 dark:border-transparent'
              : 'hover:bg-gray-100 dark:hover:bg-[#2d2d2d] text-gray-600 dark:text-gray-400'
          ]">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-user-circle text-[10px] opacity-50"></i>
                <span class="text-xs font-bold truncate pr-1">
                  {{ char.name || '未命名角色' }}
                </span>
                <i v-if="currentPhaseId && hasOverride(char, currentPhaseId)"
                  class="fa-solid fa-pen-nib text-[10px] text-orange-400" title="此阶段有特定变更"></i>
              </div>
              <div class="flex items-center w-[60px] justify-end shrink-0">
                <SidebarActionGroup :can-move-up="characterStore.rawCharacters.indexOf(char._original) !== 0"
                  :can-move-down="characterStore.rawCharacters.indexOf(char._original) !== characterStore.rawCharacters.length - 1"
                  @move-up="characterStore.moveCharacter(char.id, 'up')"
                  @move-down="characterStore.moveCharacter(char.id, 'down')" @delete="removeCharacter(char.id)" />
              </div>
            </div>
            <div class="flex flex-wrap gap-1 ml-5">
              <span v-for="alias in char.aliases.slice(0, 2)" :key="alias"
                class="px-1 py-0.5 bg-white/50 dark:bg-black/20 text-gray-400 rounded text-[8px] font-mono leading-none">
                {{ alias }}
              </span>
              <span v-if="char.aliases.length > 2" class="text-[8px] text-gray-400">...</span>
            </div>
          </div>
        </div>
      </div>
    </SidePanel>

    <!-- 详情编辑区 -->
    <main class="flex-1 overflow-y-auto bg-white dark:bg-[#1e1e1e] animate-fade-in custom-scrollbar view-transition">
      <div v-if="activeCharacter" class="max-w-4xl mx-auto p-8 space-y-12 pb-24">
        <!-- 头部 -->
        <header class="flex items-center justify-between border-b dark:border-[#333] pb-6">
          <div class="flex items-baseline gap-4">
            <h1 class="text-2xl font-bold dark:text-gray-100">
              {{ activeCharacter.name }}
              <span v-if="currentPhaseId"
                class="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 ml-2 font-normal">
                @{{phases.find(p => p.id === currentPhaseId)?.label}}
              </span>
            </h1>
            <span class="text-xs text-gray-400 font-mono">{{ activeCharacter.id }}</span>
          </div>
          <div v-if="settingsStore.getSettings()['ai.enabled']" class="flex items-center gap-2">
            <AIButton @click="openAIAssistant('builtin-character-design')" class="!px-3 !py-1.5 shadow-purple-500/20">
              AI 创作
            </AIButton>
          </div>
        </header>

        <div v-if="currentPhaseId"
          class="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
          <i class="fa-solid fa-clock-rotate-left mt-0.5"></i>
          <div>
            <div class="font-bold">正在编辑历史阶段数据</div>
            <p class="opacity-80">当前处于“{{phases.find(p => p.id === currentPhaseId)?.label
            }}”阶段。您在此处的修改将仅应用于该阶段（Override），未修改的字段将继承自基础设定。</p>
          </div>
        </div>

        <!-- 角色基本信息 -->
        <section class="space-y-4">
          <div class="flex items-center justify-between border-b dark:border-[#333333] pb-2">
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <i class="fa-solid fa-address-card text-[10px]"></i>
              角色基本信息
            </h3>
          </div>

          <div
            class="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50/30 dark:bg-[#252525]/30">
            <div class="space-y-4">
              <div class="space-y-2">
                <CharacterFieldLabel label="姓名" :is-overridden="isOverridden('name')" @restore="restoreField('name')" />
                <Input :model-value="activeCharacter.name" placeholder="角色姓名或核心称谓"
                  @update:model-value="(val) => updateField('name', val)" @focus="startEdit()" @blur="endEdit()" />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <CharacterFieldLabel label="性别" :is-overridden="isOverridden('gender')"
                    @restore="restoreField('gender')" />
                  <Input :model-value="activeCharacter.gender" placeholder="角色性别"
                    @update:model-value="(val) => updateField('gender', val)" @focus="startEdit()" @blur="endEdit()" />
                </div>
                <div class="space-y-2">
                  <CharacterFieldLabel label="年龄" :is-overridden="isOverridden('age')" @restore="restoreField('age')" />
                  <Input :model-value="activeCharacter.age" placeholder="角色年龄"
                    @update:model-value="(val) => updateField('age', val)" @focus="startEdit()" @blur="endEdit()" />
                </div>
              </div>

              <div class="space-y-2">
                <CharacterFieldLabel label="别名" :is-overridden="isOverridden('aliases')"
                  @restore="restoreField('aliases')" />
                <ChipInput :model-value="activeCharacter.aliases" placeholder="角色昵称或别名"
                  @update:model-value="(val) => updateField('aliases', val)" @focusin="startEdit()"
                  @focusout="endEdit()" />
              </div>

              <div class="space-y-2">
                <CharacterFieldLabel label="角色阵营" :is-overridden="isOverridden('factions')"
                  @restore="restoreField('factions')" />
                <ChipInput :model-value="activeCharacter.factions" placeholder="角色所属的组织、流派或社会地位"
                  @update:model-value="(val) => updateField('factions', val)" @focusin="startEdit()"
                  @focusout="endEdit()" />
              </div>
              <div class="space-y-2">
                <CharacterFieldLabel label="角色身份" :is-overridden="isOverridden('identities')"
                  @restore="restoreField('identities')" />
                <ChipInput :model-value="activeCharacter.identities" placeholder="角色的具体职位、称号或社会标签"
                  @update:model-value="(val) => updateField('identities', val)" @focusin="startEdit()"
                  @focusout="endEdit()" />
              </div>
            </div>

            <div class="space-y-4">
              <div class="space-y-2">
                <CharacterFieldLabel label="角色定位" :is-overridden="isOverridden('positioning')"
                  @restore="restoreField('positioning')" />
                <Input :model-value="activeCharacter.positioning" placeholder="角色在故事中的定位，如主角、核心配角、对立角色等"
                  @update:model-value="(val) => updateField('positioning', val)" @focus="startEdit()"
                  @blur="endEdit()" />
              </div>

              <div class="space-y-2">
                <CharacterFieldLabel label="动机目标" :is-overridden="isOverridden('motivation')"
                  @restore="restoreField('motivation')" />
                <Input type="textarea" :model-value="activeCharacter.motivation" placeholder="角色的核心目标与行动理由" auto-resize
                  :rows="2" @update:model-value="(val) => updateField('motivation', val)" @focus="startEdit()"
                  @blur="endEdit()" />
              </div>

              <div class="space-y-2">
                <CharacterFieldLabel label="外貌着装" :is-overridden="isOverridden('appearance')"
                  @restore="restoreField('appearance')" />
                <Input type="textarea" :model-value="activeCharacter.appearance" placeholder="角色的体貌特征、惯常穿着" auto-resize
                  :rows="3" @update:model-value="(val) => updateField('appearance', val)" @focus="startEdit()"
                  @blur="endEdit()" />
              </div>

              <div class="space-y-2">
                <CharacterFieldLabel label="性格特征" :is-overridden="isOverridden('personality')"
                  @restore="restoreField('personality')" />
                <Input type="textarea" :model-value="activeCharacter.personality" placeholder="角色的核心性格、行事逻辑" auto-resize
                  :rows="3" @update:model-value="(val) => updateField('personality', val)" @focus="startEdit()"
                  @blur="endEdit()" />
              </div>

              <div class="space-y-2">
                <CharacterFieldLabel label="身份背景" :is-overridden="isOverridden('background')"
                  @restore="restoreField('background')" />
                <Input type="textarea" :model-value="activeCharacter.background" placeholder="角色的出身、过往经历、关键转折点"
                  auto-resize :rows="8" @update:model-value="(val) => updateField('background', val)"
                  @focus="startEdit()" @blur="endEdit()" />
              </div>
            </div>
          </div>
        </section>

        <!-- 角色间关系 -->
        <section class="space-y-4">
          <div class="flex items-center justify-between border-b dark:border-[#333333] pb-2">
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <i class="fa-solid fa-users text-[10px]"></i>
              角色间关系
            </h3>
            <Button size="sm" icon="fa-solid fa-plus" @click="addRel">
              添加关系
            </Button>
          </div>

          <div class="space-y-2">
            <RelationshipItem v-for="rel in activeCharacterRelationships" :key="rel.id" :rel="rel"
              :active-character="activeCharacter" :other-characters="otherCharacters" :current-phase-id="currentPhaseId"
              @update="(updates) => updateRel(rel.id, updates)" @swap="swapDirection(rel.id)"
              @remove="removeRelation(rel.id)" />

            <div v-if="activeCharacterRelationships.length === 0"
              class="py-8 text-center border-2 border-dashed border-gray-200 dark:border-[#333] rounded-xl text-xs text-gray-400">
              <p>暂无关系</p>
              <button @click="addRel" class="mt-2 text-blue-500 hover:underline">点击添加</button>
            </div>

            <div v-if="hiddenRelationships.length > 0" class="pt-4">
              <div @click="showHiddenRelations = !showHiddenRelations"
                class="flex items-center justify-center gap-2 py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer rounded hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors select-none">
                <i class="fa-solid" :class="showHiddenRelations ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                <span>存在 {{ hiddenRelationships.length }} 个当前阶段不生效（已断绝/隐藏）的关系</span>
              </div>

              <div v-if="showHiddenRelations"
                class="space-y-2 mt-2 pl-4 border-l-2 border-dashed border-gray-200 dark:border-[#333]">
                <div v-for="rel in hiddenRelationships" :key="rel.id"
                  class="flex items-center gap-2 p-2 rounded-lg border border-dashed border-gray-200 dark:border-[#444] bg-gray-50 dark:bg-[#252525] opacity-75">
                  <span class="text-xs text-gray-500">
                    {{rel.sourceId === activeCharacterId ? '本角色' : otherCharacters.find(c => c.id ===
                      rel.sourceId)?.name
                      || '未知'}}
                    <i class="fa-solid fa-arrow-right text-[10px] mx-1"></i>
                    {{rel.targetId === activeCharacterId ? '本角色' : otherCharacters.find(c => c.id ===
                      rel.targetId)?.name
                      || '未知'}}
                  </span>
                  <span class="text-xs text-gray-400 mx-1">的</span>
                  <span class="text-xs font-bold text-gray-500">{{ rel.label }}</span>

                  <div class="flex-1"></div>

                  <button @click="updateRel(rel.id, { isActive: true })" title="在此阶段恢复/重连"
                    class="text-[10px] text-blue-500 hover:underline px-2">
                    <i class="fa-solid fa-rotate-left mr-1"></i>恢复
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>


        <!-- 创作备注 (规范 2.5) -->
        <section class="space-y-6 pt-12 border-t dark:border-[#333]">
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">创作备注</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="space-y-2">
              <label class="text-[10px] font-bold text-gray-500 uppercase">作者私语</label>
              <Input type="textarea" v-model="activeCharacter.notes.authorNotes" placeholder="灵感或计划..." auto-resize
                :rows="4" @focus="startEdit()" @blur="endEdit()" />
            </div>
            <div class="space-y-2">
              <label class="text-[10px] font-bold text-gray-500 uppercase">待解悬念</label>
              <Input type="textarea" v-model="activeCharacter.notes.openQuestions" placeholder="未解之谜..." auto-resize
                :rows="4" @focus="startEdit()" @blur="endEdit()" />
            </div>
          </div>
        </section>
      </div>

      <!-- 空状态 -->
      <EmptyState v-else class="h-full" icon="fa-user-pen" title="选择或创建角色" subtitle="选择一个角色，或点击“新建角色”按钮创建一个新角色" />
    </main>

    <!-- 右侧：阶段管理 -->
    <SidePanel title="剧情阶段" width="w-64" side="right">
      <template #actions>
        <IconButton icon="fa-solid fa-plus" title="添加阶段" size="sm" variant="primary"
          @click="characterStore.addPhase()" />
      </template>

      <div class="p-2 space-y-1">
        <div @click="characterStore.setCurrentPhase(null)"
          class="p-2 rounded-lg cursor-pointer flex items-center gap-2 border border-transparent transition-colors"
          :class="!currentPhaseId ? 'bg-blue-50 dark:bg-[#37373d] text-blue-600 dark:text-blue-400 border-gray-200 dark:border-transparent' : 'hover:bg-gray-100 dark:hover:bg-[#2d2d2d] text-gray-600 dark:text-gray-400'">
          <i class="fa-solid fa-earth-americas text-[10px] opacity-70"></i>
          <span class="text-xs font-bold">全局 / 基础设定</span>
        </div>

        <div v-for="(phase, index) in phases" :key="phase.id"
          class="group relative p-2 rounded-lg cursor-pointer flex items-center justify-between border border-transparent transition-all"
          :class="currentPhaseId === phase.id ? 'bg-blue-50 dark:bg-[#37373d] text-blue-600 dark:text-blue-400 border-gray-200 dark:border-transparent' : 'hover:bg-gray-100 dark:hover:bg-[#2d2d2d] text-gray-600 dark:text-gray-400'"
          @click="characterStore.setCurrentPhase(phase.id)">
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <i class="fa-solid fa-flag text-[10px] opacity-70"></i>

            <div v-if="editingPhaseId === phase.id" class="flex-1 mr-2">
              <Input v-model="editingPhaseLabel" size="sm" @blur="savePhaseEdit" @enter="savePhaseEdit" @click.stop />
            </div>
            <span v-else class="text-xs font-bold truncate" @dblclick="startEditPhase(phase)">{{ phase.label }}</span>
          </div>

          <div class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
            v-if="editingPhaseId !== phase.id">
            <IconButton icon="fa-solid fa-pen" size="xs" title="重命名" @click.stop="startEditPhase(phase)" />
            <SidebarActionGroup :can-move-up="index > 0" :can-move-down="index < phases.length - 1"
              @move-up="characterStore.movePhase(phase.id, 'up')"
              @move-down="characterStore.movePhase(phase.id, 'down')" @delete="characterStore.deletePhase(phase.id)" />
          </div>
        </div>
      </div>
    </SidePanel>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCharacterStore } from '@/store/characters'
import { useUIStore } from '@/store/ui'
import { useSettingsStore } from '@/store/settings'
import { useProjectStore } from '@/store/project'
import { useAIStore } from '@/store/ai'
import { useFieldHistory } from '@/composables/useFieldHistory'
import SidePanel from '@/components/layout/SidePanel.vue'
import ChipInput from '@/components/common/ChipInput.vue'
import SidebarActionGroup from '@/components/layout/SidebarActionGroup.vue'
import AIButton from '@/components/common/AIButton.vue'
import Button from '@/components/common/Button.vue'
import IconButton from '@/components/common/IconButton.vue'
import Input from '@/components/common/Input.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import CharacterFieldLabel from '@/components/features/relations/CharacterFieldLabel.vue'
import RelationshipItem from '@/components/features/relations/RelationshipItem.vue'
import type { RelationshipData, StoryPhase } from '@/types'

// Local state for phase editing
const editingPhaseId = ref<string | null>(null)
const editingPhaseLabel = ref('')

function startEditPhase(phase: StoryPhase) {
  editingPhaseId.value = phase.id
  editingPhaseLabel.value = phase.label
}

function savePhaseEdit() {
  if (editingPhaseId.value && editingPhaseLabel.value.trim()) {
    characterStore.updatePhase(editingPhaseId.value, { label: editingPhaseLabel.value.trim() })
  }
  editingPhaseId.value = null
  editingPhaseLabel.value = ''
}

import { storeToRefs } from 'pinia'

const characterStore = useCharacterStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const settingsStore = useSettingsStore()
const aiStore = useAIStore()
const { startEdit, endEdit } = useFieldHistory()

const { activeCharacterId, currentPhaseId, phases } = storeToRefs(characterStore)

const searchQuery = ref('')

const filteredCharacters = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return characterStore.charactersInPhase
  return characterStore.charactersInPhase.filter(c =>
    c.name.toLowerCase().includes(query) ||
    c.aliases.some(t => t.toLowerCase().includes(query)) ||
    c.factions.some(t => t.toLowerCase().includes(query)) ||
    c.identities.some(t => t.toLowerCase().includes(query)) ||
    c.positioning.toLowerCase().includes(query)
  )
})

const activeCharacter = computed(() => {
  return characterStore.charactersInPhase.find(c => c.id === activeCharacterId.value) || null
})

const otherCharacters = computed(() => {
  return characterStore.charactersInPhase.filter(c => c.id !== activeCharacterId.value)
})

function updateField(key: string, value: any) {
  if (!activeCharacter.value) return
  characterStore.smartUpdateCharacter(activeCharacter.value.id, { [key]: value })
}

function restoreField(key: string) {
  if (!activeCharacter.value || !currentPhaseId.value) return
  const rawChar = activeCharacter.value._original
  if (rawChar && rawChar.base) {
    const baseValue = (rawChar.base as any)[key]
    const valueToRestore = (typeof baseValue === 'object' && baseValue !== null)
      ? JSON.parse(JSON.stringify(baseValue))
      : baseValue

    characterStore.updateCharacterOverride(activeCharacter.value.id, currentPhaseId.value, { [key]: valueToRestore })
  }
}

function isOverridden(key: string) {
  if (!currentPhaseId.value || !activeCharacterId.value) return false
  const originalC = characterStore.rawCharacters.find(c => c.id === activeCharacterId.value)
  return (originalC?.overrides?.[currentPhaseId.value] as any)?.[key] !== undefined
}

function hasOverride(char: any, phaseId: string) {
  const originalC = characterStore.rawCharacters.find(c => c.id === char.id)
  return originalC?.overrides?.[phaseId] && Object.keys(originalC.overrides[phaseId]).length > 0
}

const addCharacter = () => {
  // Always add character uses Base mode, so we might want to prompt user or just add to base
  const newChar = characterStore.addCharacter('新角色')
  if (newChar) {
    activeCharacterId.value = newChar.id
  }
}

function openAIAssistant(promptId = 'builtin-character-design') {
  if (!activeCharacter.value) return

  // 现在 show 方法支持 'all' 直接全选分类，且自动处理 keys 的启用
  aiStore.show({
    promptId: promptId,
    granular: {
      'character': [activeCharacter.value.id],
      'worldview': 'all',
      'timeline': 'all'
    },
    input: '请基于以上勾选的世界观背景与历史设定，为我深化并完善该角色的档案。'
  })
}

const removeCharacter = async (id: string) => {
  const char = characterStore.charactersInPhase.find(c => c.id === id)
  const name = char?.name || '未命名角色'

  const confirmed = await uiStore.showConfirm({
    title: '删除角色',
    message: `确定要删除角色 "${name}" 吗？`,
    confirmText: '确定删除',
    cancelText: '取消',
    type: 'danger'
  })

  if (confirmed) {
    characterStore.removeCharacter(id)
    if (activeCharacterId.value === id) {
      activeCharacterId.value = characterStore.charactersInPhase[0]?.id || null
    }
  }
}

const showHiddenRelations = ref(false)

const hiddenRelationships = computed(() => {
  if (!activeCharacterId.value || !currentPhaseId.value) return []
  return characterStore.allRelationshipsInPhase
    .filter(r =>
      (r.sourceId === activeCharacterId.value || r.targetId === activeCharacterId.value) &&
      r.isActive === false
    )
})

const activeCharacterRelationships = computed(() => {
  if (!activeCharacterId.value) return []
  // 使用 relationshipsInPhase 获取当前阶段下的有效关系（包含 override）
  return characterStore.relationshipsInPhase.filter(r =>
    r.sourceId === activeCharacterId.value || r.targetId === activeCharacterId.value
  )
})

const swapDirection = (relId: string) => {
  const rel = activeCharacterRelationships.value.find(r => r.id === relId)
  if (rel) {
    characterStore.smartUpdateRelationship(relId, {
      sourceId: rel.targetId,
      targetId: rel.sourceId
    })
  }
}

const addRel = async () => {
  if (!activeCharacterId.value) return

  // 如果处于阶段视图，询问用户意图
  if (currentPhaseId.value) {
    // 简单起见，这里演示两个选项（实际UI可优化为 SplitButton 或 Menu）
    const choice = await uiStore.showConfirm({
      title: '添加关系',
      message: '您希望这个关系仅在当前阶段存在（临时），还是贯穿所有阶段（全局）？',
      confirmText: '仅当前阶段',
      cancelText: '全局通用',
      type: 'info' // Use info type
    })

    if (choice) {
      // 1. 创建全局隐藏的关系
      const newRel = characterStore.addRelationship(activeCharacterId.value, '', 'custom', false)
      if (newRel) {
        // 2. 仅在当前阶段激活
        characterStore.updateRelationshipOverride(newRel.id, currentPhaseId.value, { isActive: true })
      }
      return
    }
  }

  // 默认：全局添加
  characterStore.addRelationship(activeCharacterId.value, '', 'custom')
}

const removeRelation = async (relId: string) => {
  const mode = characterStore.getRelationshipDeleteMode(relId)

  if (mode === 'logical') {
    const confirmed = await uiStore.showConfirm({
      title: '断绝关系',
      message: '确定要在当前阶段断绝此关系吗？(关系将在此阶段隐藏)',
      confirmText: '断绝',
      cancelText: '取消',
      type: 'warning'
    })

    if (confirmed) {
      characterStore.smartUpdateRelationship(relId, { isActive: false })
    }
  } else {
    // Physical delete
    const confirmed = await uiStore.showConfirm({
      title: '删除关系',
      message: '确定要永久删除这条关系吗？',
      confirmText: '删除',
      cancelText: '取消',
      type: 'danger'
    })

    if (confirmed) {
      characterStore.removeRelationship(relId)
    }
  }
}

const updateRel = (relId: string, parsed: Partial<RelationshipData>) => {
  characterStore.smartUpdateRelationship(relId, parsed)
}

watch(() => activeCharacter.value, (newVal, oldVal) => {
  if (newVal && oldVal && newVal.id === oldVal.id) {
    projectStore.markDirty()
  }
}, { deep: true })
</script>
