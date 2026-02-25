<template>
  <nav class="w-14 border-r border-divider bg-app-side flex flex-col items-center py-4 gap-4 shrink-0 no-drag">
    <template v-for="(item, index) in navItems" :key="item.to || index">
      <!-- 占位符/缝隙：用于将后续菜单挤到底部 -->
      <div v-if="item.spacer" class="flex-1"></div>

      <!-- 常规导航项 -->
      <router-link 
        v-else
        :to="item.to!" 
        class="w-10 h-10 flex items-center justify-center rounded-main transition-all duration-200 text-gray-500 dark:text-gray-400 hover:bg-app-hover hover:text-blue-600 dark:hover:text-blue-400"
        :class="{ 'opacity-30 pointer-events-none grayscale': isItemDisabled(item) }"
        active-class="!bg-app-main !text-blue-600 shadow-sm"
        :title="item.title"
      >
        <i :class="[item.icon, 'text-lg']"></i>
      </router-link>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { useProjectStore } from '@/store/project'

const projectStore = useProjectStore()

interface NavItem {
  to?: string
  icon?: string
  title?: string
  spacer?: boolean
}

const navItems: NavItem[] = [
  { to: '/outline', icon: 'fa-solid fa-map', title: '大纲构思' },
  { to: '/editor', icon: 'fa-solid fa-pen-nib', title: '章节写作' },
  { to: '/characters', icon: 'fa-solid fa-user-group', title: '角色库' },
  { to: '/worldview', icon: 'fa-solid fa-book-atlas', title: '世界观' },
  { to: '/timeline', icon: 'fa-solid fa-timeline', title: '时间线' },
  { spacer: true },
  { to: '/settings', icon: 'fa-solid fa-gear', title: '首选项' },
  { to: '/about', icon: 'fa-solid fa-circle-info', title: '关于 GlyphForge' },
]

function isItemDisabled(item: NavItem) {
  if (item.spacer) return false
  const protectedPaths = ['/outline', '/editor', '/characters', '/worldview', '/timeline']
  return protectedPaths.includes(item.to || '') && !projectStore.isLoaded
}
</script>
