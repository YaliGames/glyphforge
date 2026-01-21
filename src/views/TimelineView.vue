<template>
  <div class="flex-1 flex overflow-hidden bg-white dark:bg-[#1e1e1e]">
    <!-- 左侧：快速跳转 -->
    <SidePanel title="历史轨迹" width="w-64" side="left">
      <template #actions>
        <button @click="addTimelineEvent"
          class="p-1.5 hover:bg-gray-200 dark:hover:bg-[#333333] rounded text-blue-600 dark:text-blue-400 transition-colors"
          title="新建时间点">
          <i class="fa-solid fa-plus text-xs"></i>
        </button>
      </template>

      <div class="p-2 space-y-2">
        <div class="relative">
          <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400"></i>
          <input v-model="searchQuery" type="text" placeholder="搜索时间轴事件..."
            class="w-full bg-white dark:bg-[#2d2d2d] border dark:border-[#333333] rounded-md pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
        </div>

        <nav class="space-y-1">
          <div v-for="event in filteredEvents" :key="event.id" @click="scrollToId('event-' + event.id)" :class="[
            'group p-2 rounded-lg cursor-pointer transition-all duration-200 relative hover:translate-x-0.5 border border-transparent',
            'hover:bg-gray-100 dark:hover:bg-[#2d2d2d] text-gray-600 dark:text-gray-400'
          ]">
            <div class="flex items-center justify-between mb-0.5">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></div>
                <span class="text-xs font-bold truncate pr-1">{{ event.title || '未命名事件' }}</span>
              </div>
              <div class="flex items-center w-[60px] shrink-0">
                <SidebarActionGroup 
                  :can-move-up="worldviewStore.worldview?.timeline.indexOf(event) !== 0"
                  :can-move-down="worldviewStore.worldview?.timeline.indexOf(event) !== (worldviewStore.worldview?.timeline.length ?? 0) - 1"
                  @move-up="worldviewStore.moveTimelineEvent(event.id, 'up')"
                  @move-down="worldviewStore.moveTimelineEvent(event.id, 'down')"
                  @delete="removeTimelineEvent(event.id)"
                />
              </div>
            </div>
            <div class="text-[9px] font-mono text-gray-400 ml-3.5 opacity-60 group-hover:opacity-100">{{ event.time.label || '待定时刻' }}</div>
          </div>
        </nav>
      </div>
    </SidePanel>

    <!-- 右侧滚动内容区 -->
    <main class="flex-1 overflow-y-auto bg-white dark:bg-[#1e1e1e] scroll-smooth custom-scrollbar view-transition">
      <div v-if="worldviewStore.worldview?.timeline" class="max-w-4xl mx-auto px-12 py-10 space-y-16">
        
        <!-- 时间线 (规范 4.3) -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold dark:text-gray-100 flex items-center gap-3">
              历史轨迹
              <span class="text-xs font-normal text-gray-400">按故事发生的相对顺序排列</span>
            </h3>
            <button 
              @click="addTimelineEvent"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <i class="fa-solid fa-plus"></i>
              创建时间点
            </button>
          </div>
          
          <!-- 空状态 -->
          <EmptyState
            v-if="worldviewStore.worldview.timeline.length === 0" 
            class="h-full"
            icon="fa-hourglass-start"
            title="尚未创建时间点"
            subtitle="这个世界还没有过去，直到你写下第一个时刻"
          />

          <div v-else class="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-[2px] before:bg-gray-100 dark:before:bg-[#2d2d2d]">
            <div 
              v-for="event in worldviewStore.worldview.timeline" 
              :key="event.id"
              :id="'event-' + event.id"
              class="relative pl-10 group pt-4 animate-slide-up"
            >
              <!-- 轴点 -->
              <div class="absolute left-0 top-[22px] w-6 h-6 rounded-full bg-white dark:bg-[#1e1e1e] border-2 border-blue-500 shadow-sm z-10 transition-transform group-hover:scale-110"></div>
              
              <div class="bg-white dark:bg-[#1e1e1e] border dark:border-[#333] rounded-xl p-5 space-y-4 shadow-sm group-hover:border-blue-200 dark:group-hover:border-blue-900/30 transition-all">
                <div class="flex items-start justify-between">
                  <div class="space-y-1 flex-1">
                    <div class="flex items-center gap-3">
                      <input 
                        v-model="event.time.label"
                        class="bg-transparent border-none text-[10px] font-mono text-blue-500 focus:outline-none uppercase"
                        placeholder="发生时间或历史标记..."
                        @focus="startEdit()"
                        @blur="endEdit()"
                      />
                      <span class="text-[10px] text-gray-300">#{{ event.time.order }}</span>
                    </div>
                    <input 
                      v-model="event.title"
                      class="w-full bg-transparent border-none text-sm font-bold dark:text-gray-200 focus:outline-none"
                      placeholder="事件标题..."
                      @focus="startEdit()"
                      @blur="endEdit()"
                    />
                  </div>
                  <button @click="removeTimelineEvent(event.id)" class="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all">
                    <i class="fa-solid fa-trash-can text-[10px]"></i>
                  </button>
                </div>

                <textarea 
                  v-model="event.description"
                  rows="2"
                  class="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-lg p-3 text-xs outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder="描述发生了什么..."
                  @focus="startEdit()"
                  @blur="endEdit()"
                ></textarea>

                <div class="flex flex-wrap gap-4 pt-2 border-t dark:border-[#2d2d2d]">
                  <div class="space-y-1.5 flex-1">
                    <label class="text-[9px] font-bold text-gray-400 uppercase">主要关联</label>
                    <div class="flex flex-wrap gap-1.5">
                      <span v-for="pid in event.participants" :key="pid" class="px-2 py-0.5 bg-gray-100 dark:bg-[#333] rounded text-[10px] text-gray-600 dark:text-gray-400">{{ pid }}</span>
                      <button class="text-[10px] text-blue-500 hover:underline">+ 关联</button>
                    </div>
                  </div>
                  <div class="space-y-1.5 flex-1">
                    <label class="text-[9px] font-bold text-gray-400 uppercase">波及影响</label>
                    <div class="flex flex-wrap gap-1.5">
                      <span v-for="imp in event.impact" :key="imp" class="px-2 py-0.5 bg-orange-50 dark:bg-orange-900/10 text-orange-600 rounded text-[10px]">{{ imp }}</span>
                      <button class="text-[10px] text-orange-500 hover:underline">+ 领域</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorldviewStore } from '@/store/worldview'
import { useFieldHistory } from '@/composables/useFieldHistory'
import { useUIStore } from '@/store/ui'
import SidePanel from '@/components/layout/SidePanel.vue'
import SidebarActionGroup from '@/components/layout/SidebarActionGroup.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const worldviewStore = useWorldviewStore()
const uiStore = useUIStore()
const { startEdit, endEdit } = useFieldHistory()

const searchQuery = ref('')
const filteredEvents = computed(() => {
  if (!worldviewStore.worldview) return []
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return worldviewStore.worldview.timeline
  return worldviewStore.worldview.timeline.filter(e => 
    e.title.toLowerCase().includes(query) || 
    e.description.toLowerCase().includes(query) ||
    e.time.label.toLowerCase().includes(query)
  )
})

function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}

const addTimelineEvent = () => {
  worldviewStore.addTimelineEvent()
}

const removeTimelineEvent = async (id: string) => {
  const confirmed = await uiStore.showConfirm({
    title: '删除事件',
    message: '确定要从时间线中移除此事件吗？',
    confirmText: '确定删除',
    cancelText: '取消',
    type: 'danger'
  })
  if (confirmed) {
    worldviewStore.removeTimelineEvent(id)
  }
}
</script>

<style scoped>
/* 时间轴特有样式 */
</style>
