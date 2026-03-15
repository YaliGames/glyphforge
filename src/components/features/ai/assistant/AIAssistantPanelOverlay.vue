<template>
  <transition name="panel-slide">
    <div v-if="activePanel" class="absolute inset-0 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-md z-40 flex flex-col shadow-inner overflow-hidden">
      <header class="h-12 border-b dark:border-[#333] px-4 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-[#252525]/50">
        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <i :class="[
            activePanel === 'context' ? 'fa-solid fa-database text-blue-500' : 'fa-solid fa-wand-sparkles text-purple-500'
          ]"></i>
          {{ activePanel === 'context' ? '参考上下文配置' : '指令模板库' }}
        </span>
        <div class="flex items-center gap-1">
          <button v-if="activePanel === 'prompts'" @click="emit('open-prompt-library')" class="w-8 h-8 flex items-center justify-center hover:bg-purple-100 dark:hover:bg-purple-900/20 rounded-lg text-purple-500 transition-colors" title="管理库">
            <i class="fa-solid fa-gear text-xs"></i>
          </button>
          <button @click="activePanelModel = null" class="w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#333] rounded-lg text-gray-400">
            <i class="fa-solid fa-chevron-down text-sm"></i>
          </button>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto p-5 space-y-8">
        <div v-if="activePanel === 'context'" class="space-y-8">
          <div class="space-y-3">
            <div class="text-ui-header px-1">基础 & 备忘</div>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="val in ['project', 'authorNotes']"
                :key="val"
                @click="emit('toggle-context', val)"
                class="flex items-center justify-between p-3 rounded-2xl border text-left transition-all hover:shadow-md relative"
                :class="referenceKeys.includes(val)
                  ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800 ring-2 ring-purple-100/50 dark:ring-purple-900/30'
                  : 'bg-white dark:bg-[#252525] border-gray-100 dark:border-white/5 shadow-sm'"
              >
                <div class="flex items-center gap-3">
                  <i class="text-xs" :class="[
                    val === 'project' ? 'fa-solid fa-file-invoice' : 'fa-solid fa-note-sticky',
                    referenceKeys.includes(val) ? 'text-purple-600' : 'text-gray-400'
                  ]"></i>
                  <span class="text-[11px] font-bold" :class="referenceKeys.includes(val) ? 'text-purple-700' : 'text-gray-600 dark:text-gray-400'">
                    {{ findNodeByValue(val)?.label }}
                  </span>
                </div>
                <span v-if="referenceKeys.includes(val)"
                  class="text-[9px] bg-red-500 text-white min-w-[14px] h-[14px] flex items-center justify-center rounded-full px-1 shadow-sm font-bold scale-90"
                >
                  1
                </span>
              </button>
            </div>
          </div>

          <div class="space-y-3">
            <div class="text-ui-header px-1">正文 & 结构</div>
            <div class="space-y-4">
              <div v-for="val in ['manuscript', 'outline', 'chapters']" :key="val" class="space-y-2">
                <button
                  @click="emit('toggle-context', val)"
                  class="w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all hover:shadow-md group"
                  :class="referenceKeys.includes(val)
                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800 ring-2 ring-blue-100/50 dark:ring-blue-900/30'
                    : 'bg-white dark:bg-[#252525] border-gray-100 dark:border-white/5 shadow-sm'"
                >
                  <div class="flex items-center gap-3 truncate">
                    <i class="text-xs" :class="[
                      val === 'manuscript' ? 'fa-solid fa-pen-nib' : val === 'outline' ? 'fa-solid fa-diagram-project' : 'fa-solid fa-list-ul',
                      referenceKeys.includes(val) ? 'text-blue-600' : 'text-gray-400'
                    ]"></i>
                    <span class="text-[11px] font-bold truncate" :class="referenceKeys.includes(val) ? 'text-blue-700' : 'text-gray-600 dark:text-gray-400'">
                      {{ findNodeByValue(val)?.label }}
                    </span>
                  </div>

                  <div class="flex items-center gap-2">
                    <span v-if="granularSelections[val]?.length > 0"
                      class="text-[9px] bg-red-500 text-white min-w-[14px] h-[14px] flex items-center justify-center rounded-full px-1 shadow-sm font-bold scale-90"
                    >
                      {{ granularSelections[val].length }}
                    </span>
                    <i v-if="findNodeByValue(val)?.isGranular"
                      class="fa-solid fa-chevron-right text-[8px] text-gray-300 group-hover:translate-x-0.5 transition-transform"
                      :class="{ 'rotate-90': expandedKeys.includes(val) }"
                    ></i>
                  </div>
                </button>

                <div v-if="expandedKeys.includes(val) && findNodeByValue(val)?.isGranular"
                      class="bg-indigo-50/30 dark:bg-indigo-900/5 border border-indigo-100/50 dark:border-indigo-800/30 rounded-2xl p-3 shadow-inner">
                  <div class="mb-2 flex items-center justify-between">
                    <div class="text-ui-header flex items-center gap-2">
                      <i class="fa-solid fa-filter text-[8px]"></i>
                      针对 {{ findNodeByValue(val)?.label }} 的筛选
                    </div>
                    <button
                      v-if="val !== 'manuscript'"
                      @click="emit('toggle-select-all', val)"
                      class="text-[9px] font-bold px-2 py-0.5 rounded bg-white dark:bg-black/20 border dark:border-white/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                    >
                      {{ (granularSelections[val]?.length || 0) === getOptionsForValue(val).length ? '取消全选' : '全选' }}
                    </button>
                  </div>
                  <div class="grid grid-cols-2 gap-1.5 max-h-[130px] overflow-y-auto custom-scrollbar pr-1">
                    <button
                      v-for="item in getOptionsForValue(val)"
                      :key="item.id"
                      @click="emit('toggle-granular-item', { key: val, id: item.id })"
                      class="px-2 py-1.5 rounded-lg text-[10px] border transition-all truncate text-left"
                      :class="granularSelections[val]?.includes(item.id)
                        ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                        : 'bg-white dark:bg-[#111] border-gray-100 dark:border-white/5 text-gray-500'"
                    >
                      {{ item.label }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div class="text-ui-header px-1">世界 & 角色</div>
            <div class="space-y-4">
              <div v-for="val in ['worldview', 'timeline', 'character']" :key="val" class="space-y-2">
                <button
                  @click="emit('toggle-context', val)"
                  class="w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all hover:shadow-md group"
                  :class="referenceKeys.includes(val)
                    ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800 ring-2 ring-orange-100/50 dark:ring-orange-900/30'
                    : 'bg-white dark:bg-[#252525] border-gray-100 dark:border-white/5 shadow-sm'"
                >
                  <div class="flex items-center gap-3 truncate">
                    <i class="text-xs" :class="[
                      val === 'worldview' ? 'fa-solid fa-earth-asia' : val === 'timeline' ? 'fa-solid fa-clock-rotate-left' : 'fa-solid fa-users',
                      referenceKeys.includes(val) ? 'text-orange-600' : 'text-gray-400'
                    ]"></i>
                    <span class="text-[11px] font-bold truncate" :class="referenceKeys.includes(val) ? 'text-orange-700' : 'text-gray-600 dark:text-gray-400'">
                      {{ findNodeByValue(val)?.label }}
                    </span>
                  </div>

                  <div class="flex items-center gap-2">
                    <span v-if="granularSelections[val]?.length > 0"
                      class="text-[9px] bg-red-500 text-white min-w-[14px] h-[14px] flex items-center justify-center rounded-full px-1 shadow-sm font-bold scale-90"
                    >
                      {{ granularSelections[val].length }}
                    </span>
                    <i v-if="findNodeByValue(val)?.isGranular"
                      class="fa-solid fa-chevron-right text-[8px] text-gray-300 group-hover:translate-x-0.5 transition-transform"
                      :class="{ 'rotate-90': expandedKeys.includes(val) }"
                    ></i>
                  </div>
                </button>

                <div v-if="expandedKeys.includes(val) && findNodeByValue(val)?.isGranular"
                     class="bg-indigo-50/30 dark:bg-indigo-900/5 border border-indigo-100/50 dark:border-indigo-800/30 rounded-2xl p-3 shadow-inner">
                  <div class="mb-2 flex items-center justify-between">
                    <div class="text-ui-header flex items-center gap-2">
                      <i class="fa-solid fa-filter text-[8px]"></i>
                      针对 {{ findNodeByValue(val)?.label }} 的筛选
                    </div>
                    <button
                      v-if="val !== 'manuscript'"
                      @click="emit('toggle-select-all', val)"
                      class="text-[9px] font-bold px-2 py-0.5 rounded bg-white dark:bg-black/20 border dark:border-white/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                    >
                      {{ (granularSelections[val]?.length || 0) === getOptionsForValue(val).length ? '取消全选' : '全选' }}
                    </button>
                  </div>
                  <div class="grid grid-cols-2 gap-1.5 max-h-[130px] overflow-y-auto custom-scrollbar pr-1">
                    <button
                      v-for="item in getOptionsForValue(val)"
                      :key="item.id"
                      @click="emit('toggle-granular-item', { key: val, id: item.id })"
                      class="px-2 py-1.5 rounded-lg text-[10px] border transition-all truncate text-left"
                      :class="granularSelections[val]?.includes(item.id)
                        ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                        : 'bg-white dark:bg-[#111] border-gray-100 dark:border-white/5 text-gray-500'"
                    >
                      {{ item.label }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activePanel === 'prompts'" class="space-y-4 pb-12">
          <div v-for="p in allPrompts" :key="p.id"
            @click="selectPrompt(p.id)"
            class="p-4 rounded-3xl border transition-all cursor-pointer group hover:shadow-xl hover:-translate-y-0.5 relative"
            :class="selectedPromptIdModel === p.id
              ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800 ring-2 ring-purple-100 dark:ring-purple-900/20'
              : 'bg-white dark:bg-[#252525] border-gray-100 dark:border-white/5 shadow-sm'"
          >
            <div class="flex justify-between items-start mb-1">
              <div class="flex items-center gap-2">
                  <i class="fa-solid" :class="[
                    p.id.startsWith('builtin-') ? 'fa-shield-halved text-[9px] text-blue-400' : 'fa-wand-magic-sparkles text-[10px]',
                    selectedPromptIdModel === p.id ? 'text-purple-600' : 'text-gray-400'
                  ]"></i>
                  <span class="text-[11px] font-bold" :class="selectedPromptIdModel === p.id ? 'text-purple-700' : 'text-gray-600 dark:text-gray-400'">
                  {{ p.label }}
                  </span>
              </div>
              <span class="text-[8px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-black/20 text-gray-400 uppercase tracking-tighter">
                {{ p.category }}
              </span>
            </div>
            <p class="text-[10px] text-gray-400 leading-relaxed italic line-clamp-2">
              {{ p.description }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AIPrompt, ReferenceNode } from '@/types'

const props = defineProps<{
  activePanel: 'context' | 'prompts' | null
  selectedPromptId: string
  allPrompts: AIPrompt[]
  referenceKeys: string[]
  granularSelections: Record<string, string[]>
  expandedKeys: string[]
  findNodeByValue: (value: string) => ReferenceNode | null | undefined
  getOptionsForValue: (value: string) => Array<{ id: string; label: string }>
}>()

const emit = defineEmits<{
  (event: 'update:active-panel', value: 'context' | 'prompts' | null): void
  (event: 'update:selected-prompt-id', value: string): void
  (event: 'toggle-context', value: string): void
  (event: 'toggle-select-all', value: string): void
  (event: 'toggle-granular-item', payload: { key: string; id: string }): void
  (event: 'open-prompt-library'): void
}>()

const activePanelModel = computed({
  get: () => props.activePanel,
  set: (value: 'context' | 'prompts' | null) => emit('update:active-panel', value)
})

const selectedPromptIdModel = computed({
  get: () => props.selectedPromptId,
  set: (value: string) => emit('update:selected-prompt-id', value)
})

function selectPrompt(promptId: string) {
  selectedPromptIdModel.value = promptId
  activePanelModel.value = null
}
</script>

<style scoped>
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>
