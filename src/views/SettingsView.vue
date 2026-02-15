<template>
  <div class="h-full flex bg-[#f3f3f3] dark:bg-[#1a1a1a] overflow-hidden">
    <!-- 左侧导航 (VS Code Style) -->
    <aside class="w-64 border-r dark:border-[#333] flex flex-col pt-6 pb-12 shrink-0 bg-[#f3f3f3] dark:bg-[#252526]">
      <div class="px-6 mb-4">
        <h2 class="text-sm font-bold dark:text-gray-200 uppercase tracking-widest opacity-60">设置</h2>
      </div>

      <!-- 搜索栏 -->
      <div class="px-3 mb-6">
        <Input 
          v-model="searchQuery" 
          placeholder="搜索设置..."
          icon-prefix="fa-solid fa-search"
        />
      </div>

      <nav class="flex-1 space-y-1 px-3 overflow-y-auto">
        <button 
          v-for="section in filteredSchema" 
          :key="section.id"
          @click="scrollToSection(section.id)"
          :class="[
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all',
            activeSectionId === section.id 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
              : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-[#37373d] hover:text-gray-700 dark:hover:text-gray-300'
          ]"
        >
          <i :class="['fa-solid', section.icon, 'w-4']"></i>
          {{ section.label }}
        </button>
      </nav>
    </aside>

    <!-- 右侧滚动内容区 -->
    <main 
      class="flex-1 overflow-y-auto pt-10 pb-24 scroll-smooth bg-white dark:bg-[#1e1e1e]"
      ref="scrollContainer"
      @scroll="handleScroll"
    >
      <div class="max-w-3xl mx-auto px-12 space-y-16">
        <template v-for="section in filteredSchema" :key="section.id">
          <div :id="`section-${section.id}`" class="space-y-6 scroll-mt-10">
            <div class="flex items-center gap-3 border-b dark:border-[#333] pb-3">
              <i :class="['fa-solid', section.icon, 'text-gray-400']"></i>
              <h3 class="text-lg font-bold dark:text-gray-100 uppercase tracking-tight">{{ section.label }}</h3>
            </div>

            <div class="space-y-8 pl-1">
              <template v-for="item in section.items" :key="item.key">
                <div v-if="shouldShow(item)" class="flex items-start justify-between gap-12 group">
                  <div class="flex-1 space-y-1">
                    <div class="text-xs font-bold dark:text-gray-200 flex items-center gap-2">
                      {{ item.label }}
                      <span class="text-[9px] font-mono text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">[{{ item.key }}]</span>
                    </div>
                    <div class="text-[11px] text-gray-500 leading-relaxed">{{ item.description }}</div>
                  </div>

                  <div class="shrink-0 flex items-center min-h-[32px]">
                    <!-- Boolean Toggle -->
                    <label v-if="item.type === 'boolean'" class="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        :checked="settingsStore.getSettings()[item.key]"
                        @change="(e: any) => settingsStore.updateSetting(item.key, e.target.checked)"
                        class="sr-only peer"
                      >
                      <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                    </label>

                    <!-- Number Input -->
                    <Input 
                      v-else-if="item.type === 'number'"
                      type="number"
                      :model-value="settingsStore.getSettings()[item.key]"
                      @update:model-value="(val) => settingsStore.updateSetting(item.key, Number(val))"
                      class="w-24 font-mono"
                      size="sm"
                    />

                  <!-- Select Input -->
                  <select 
                    v-else-if="item.type === 'select'"
                    :value="settingsStore.getSettings()[item.key]"
                    @change="(e: any) => settingsStore.updateSetting(item.key, e.target.value)"
                    class="bg-white dark:bg-[#1e1e1e] border dark:border-[#333333] rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-500 transition-all min-w-[120px]"
                  >
                    <option v-for="opt in item.options" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>

                  <!-- Action Button -->
                  <div v-else-if="item.type === 'action'" class="flex items-center">
                    <button 
                      v-if="item.action"
                      @click="handleAction(item.action)"
                      class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                      <i v-if="item.icon" :class="['fa-solid', item.icon, 'mr-2']"></i>
                      {{ item.buttonLabel || '执行操作' }}
                    </button>
                  </div>

                  <!-- String Input -->
                  <Input 
                    v-else-if="item.type === 'string'"
                    :model-value="settingsStore.getSettings()[item.key]"
                    @update:model-value="(val) => settingsStore.updateSetting(item.key, val)"
                    class="w-64"
                    size="sm"
                    placeholder="请输入内容..."
                  />
                </div>
              </div>
            </template>
          </div>
        </div>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSettingsStore } from '@/store/settings'
import { useActions } from '@/composables/useActions'
import { SETTINGS_SCHEMA, type SettingItem, type SettingSection } from '@/config/settings.schema'
import { useRoute } from 'vue-router'
import Input from '@/components/common/Input.vue'

const settingsStore = useSettingsStore()
const { handleAction } = useActions()
const route = useRoute()

const activeSectionId = ref(SETTINGS_SCHEMA[0].id)
const scrollContainer = ref<HTMLElement | null>(null)
const searchQuery = ref('')

// 初始化时处理路由跳转
onMounted(() => {
  // 处理从其他页面跳转来的 Section 定位
  const section = route.query.section as string
  if (section) {
    setTimeout(() => {
      scrollToSection(section)
    }, 100)
  }
})

// 基础 Schema 的投影，使用 store 中的 dynamicSchema
const filteredSchema = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  // 确保访问的是 store 的响应式属性
  const sourceSchema = (settingsStore.dynamicSchema || []) as SettingSection[]

  if (!query) return sourceSchema

  return sourceSchema.map(section => {
    const filteredItems = section.items.filter(item => 
      item.label.toLowerCase().includes(query) || 
      item.description.toLowerCase().includes(query) ||
      item.key.toLowerCase().includes(query)
    )
    
    if (filteredItems.length > 0) {
      return { ...section, items: [...filteredItems] }
    }
    return null
  }).filter(Boolean) as SettingSection[]
})

function scrollToSection(id: string) {
  activeSectionId.value = id
  const el = document.getElementById(`section-${id}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}

function handleScroll() {
  if (!scrollContainer.value) return
  
  const sourceSchema = settingsStore.dynamicSchema
  const sections = sourceSchema.map((s: SettingSection) => document.getElementById(`section-${s.id}`))
  const containerRect = scrollContainer.value.getBoundingClientRect()
  
  for (let i = sections.length - 1; i >= 0; i--) {
    const el = sections[i]
    if (el) {
      const rect = el.getBoundingClientRect()
      if (rect.top <= containerRect.top + 100) {
        activeSectionId.value = sourceSchema[i].id
        break
      }
    }
  }
}

function shouldShow(item: SettingItem) {
  if (item.hidden) return false
  if (!item.dependsOn) return true
  return settingsStore.getSettings()[item.dependsOn.key] === item.dependsOn.value
}
</script>

<style scoped>
/* 隐藏默认滚动条，使用 */
main {
  scrollbar-gutter: stable;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
