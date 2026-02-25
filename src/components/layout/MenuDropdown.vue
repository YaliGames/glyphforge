<template>
  <div 
    class="bg-app-elevated border border-divider shadow-xl rounded-md py-1 z-50 min-w-[14rem]"
    :class="[isSubmenu ? 'absolute left-full top-0 ml-0' : 'absolute top-full left-0 mt-0']"
  >
    <template v-for="(item, idx) in items" :key="idx">
      <!-- 分割线 -->
      <div v-if="item.type === 'separator'" class="my-1 border-t border-divider"></div>
      
      <!-- 菜单项 -->
      <div 
        v-else 
        class="relative"
        @mouseenter="activeIndex = idx"
        @mouseleave="activeIndex = null"
      >
        <button 
          class="w-full text-left px-4 py-1.5 text-sm text-gray-700 dark:text-gray-300 flex items-center justify-between transition-colors outline-none"
          :disabled="item.disabled"
          :class="[
            item.disabled 
              ? 'opacity-50 cursor-default' 
              : 'hover:bg-app-active hover:text-blue-600 dark:hover:text-blue-400 group/item'
          ]"
          @click.stop="handleClick(item)"
        >
          <!-- 左侧：图标 + 文字 -->
          <div class="flex items-center gap-2">
            <span class="w-4 h-4 flex items-center justify-center text-gray-400 group-hover/item:text-blue-500 shrink-0 relative transition-colors">
              <span v-if="item.icon" v-html="item.icon" class="flex items-center justify-center"></span>
            </span>
            <span>{{ item.label }}</span>
          </div>

          <!-- 右侧：快捷键 / 子菜单指示器 -->
          <div class="flex items-center gap-3 ml-6">
            <span v-if="item.shortcut" class="text-ui-badge group-hover/item:text-blue-400 transition-colors">{{ item.shortcut }}</span>
            <i v-if="item.children" class="fa-solid fa-chevron-right text-[10px] text-gray-400"></i>
            <div v-else class="w-3"></div>
          </div>
        </button>

        <!-- 递归子菜单 -->
        <MenuDropdown 
          v-if="item.children && !item.disabled && activeIndex === idx"
          :items="item.children"
          is-submenu
          @action="$emit('action', $event)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * 通用递归菜单组件
 * 支持无限深度、Separator、图标及快捷键显示
 */
import { ref } from 'vue'
import type { AppAction } from '@/types'

// 内部接口定义，与 MenuBar 协调
interface MenuItem {
  id?: AppAction
  label?: string
  action?: AppAction
  shortcut?: string
  icon?: string
  type?: 'item' | 'separator'
  disabled?: boolean
  children?: MenuItem[]
}

const props = defineProps<{
  items: MenuItem[]
  isSubmenu?: boolean
}>()

const emit = defineEmits<{
  (e: 'action', action: AppAction): void
}>()

const activeIndex = ref<number | null>(null)

const handleClick = (item: MenuItem) => {
  if (item.disabled) return
  
  const action = item.id || item.action
  if (action) {
    emit('action', action)
  }
}
</script>
