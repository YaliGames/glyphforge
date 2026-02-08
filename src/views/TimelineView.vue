<template>
  <div class="flex-1 flex overflow-hidden bg-white dark:bg-[#1e1e1e]">
    <!-- 左侧：快速跳转 -->
    <SidePanel title="历史轨迹" width="w-64" side="left">
      <template #actions>
        <Button size="xs" text icon="fa-solid fa-plus text-xs" @click="addTimelineEvent" title="新建时间点" />
      </template>

      <div class="p-2 space-y-2">
        <Input
          v-model="searchQuery"
          icon-prefix="fa-solid fa-search"
          placeholder="搜索时间轴事件..."
        />

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
                <SidebarActionGroup :can-move-up="worldviewStore.worldview?.timeline.indexOf(event) !== 0"
                  :can-move-down="worldviewStore.worldview?.timeline.indexOf(event) !== (worldviewStore.worldview?.timeline.length ?? 0) - 1"
                  @move-up="worldviewStore.moveTimelineEvent(event.id, 'up')"
                  @move-down="worldviewStore.moveTimelineEvent(event.id, 'down')"
                  @delete="removeTimelineEvent(event.id)" />
              </div>
            </div>
            <div class="text-[9px] font-mono text-gray-400 ml-3.5 opacity-60 group-hover:opacity-100">{{
              event.time.label ||
              '待定时刻' }}</div>
          </div>
        </nav>
      </div>
    </SidePanel>

    <!-- 右侧滚动内容区 -->
    <main class="flex-1 overflow-y-auto bg-white dark:bg-[#1e1e1e] scroll-smooth custom-scrollbar view-transition">
      <div v-if="worldviewStore.worldview?.timeline" class="max-w-4xl mx-auto p-8 space-y-12 pb-24">

        <!-- 时间线 (规范 4.3) -->
        <div class="space-y-4">
          <header class="flex items-center justify-between border-b dark:border-[#333] pb-6">
            <div class="flex items-baseline gap-4">
              <h1 class="text-2xl font-bold dark:text-gray-100 flex items-center gap-3">
                历史轨迹
              </h1>
              <span class="text-xs text-gray-400 font-mono tracking-wider">按故事发生的相对顺序排列</span>
            </div>
            <div class="flex items-center gap-2">
              <Button icon="fa-solid fa-plus" @click="addTimelineEvent">
                创建时间点
              </Button>
            </div>
          </header>

          <!-- 空状态 -->
          <EmptyState v-if="worldviewStore.worldview.timeline.length === 0" class="h-full" icon="fa-hourglass-start"
            title="尚未创建时间点" subtitle="这个世界还没有过去，直到你写下第一个时刻" />

          <div v-else
            class="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-[2px] before:bg-gray-100 dark:before:bg-[#2d2d2d]">
            <div v-for="event in worldviewStore.worldview.timeline" :key="event.id" :id="'event-' + event.id"
              class="relative pl-10 group pt-4 animate-slide-up">
              <!-- 轴点 -->
              <div
                class="absolute left-0 top-[22px] w-6 h-6 rounded-full bg-white dark:bg-[#1e1e1e] border-2 border-blue-500 shadow-sm z-10 transition-transform group-hover:scale-110">
              </div>

              <div
                class="bg-white dark:bg-[#1e1e1e] border dark:border-[#333] rounded-xl p-5 space-y-4 shadow-sm group-hover:border-blue-200 dark:group-hover:border-blue-900/30 transition-all">
                <div class="flex items-start justify-between">
                  <div class="space-y-3 flex-1">
                    <div class="flex items-center gap-3">
                      <Input
                        v-model="event.time.label"
                        placeholder="发生时间或历史标记..."
                        size="sm"
                        class="max-w-[200px]"
                        @focus="startEdit()"
                        @blur="endEdit()"
                      />
                      <span class="text-[10px] text-gray-300">#{{ event.time.order }}</span>
                    </div>
                    <Input
                      v-model="event.title"
                      placeholder="事件标题..."
                      @focus="startEdit()"
                      @blur="endEdit()"
                    />
                    <Input
                      type="textarea"
                      v-model="event.description"
                      placeholder="描述发生了什么..."
                      auto-resize
                      :rows="2"
                      @focus="startEdit()"
                      @blur="endEdit()"
                    />
                  </div>
                  <button @click="removeTimelineEvent(event.id)"
                    class="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-2">
                    <i class="fa-solid fa-trash-can text-[10px]"></i>
                  </button>
                </div>

                <div class="flex flex-wrap gap-4 pt-2 border-t dark:border-[#2d2d2d]">
                  <div class="space-y-1.5 flex-1">
                    <label class="text-[9px] font-bold text-gray-400 uppercase">主要关联</label>
                    <div class="flex flex-wrap gap-1.5">
                      <span v-for="pid in event.participants" :key="pid"
                        class="px-2 py-0.5 bg-gray-100 dark:bg-[#333] rounded text-[10px] text-gray-600 dark:text-gray-400">{{
                        pid }}</span>
                      <button class="text-[10px] text-blue-500 hover:underline">+ 关联</button>
                    </div>
                  </div>
                  <div class="space-y-1.5 flex-1">
                    <label class="text-[9px] font-bold text-gray-400 uppercase">波及影响</label>
                    <div class="flex flex-wrap gap-1.5">
                      <span v-for="imp in event.impact" :key="imp"
                        class="px-2 py-0.5 bg-orange-50 dark:bg-orange-900/10 text-orange-600 rounded text-[10px]">{{
                        imp
                        }}</span>
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
import Button from '@/components/common/Button.vue'
import Input from '@/components/common/Input.vue'
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
