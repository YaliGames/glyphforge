<template>
  <div class="flex items-center h-full px-2 select-none">
    <div v-for="menu in menus" :key="menu.label" class="relative h-full flex items-center">
      <button 
        class="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#37373d] rounded transition-colors"
        :class="{ 'bg-gray-100 dark:bg-[#37373d]': activeMenu === menu.label }"
        @click.stop="toggleMenu(menu.label)"
        @mouseenter="onMouseEnter(menu.label)"
      >
        {{ menu.label }}
      </button>
      
      <!-- Dropdown -->
      <div 
        v-if="activeMenu === menu.label"
        class="absolute top-full left-0 mt-0 w-56 bg-white dark:bg-[#252526] border border-gray-200 dark:border-[#333333] shadow-xl rounded-md py-1 z-50"
      >
        <template v-for="(item, idx) in menu.items" :key="idx">
          <div v-if="item.type === 'separator'" class="my-1 border-t border-gray-100 dark:border-[#333333]"></div>
          
          <!-- Submenu Item -->
          <div v-else-if="item.children" class="relative group/sub">
            <button 
              class="w-full text-left px-4 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-[#37373d] hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-between group/item"
              :disabled="item.disabled"
              :class="{ 'opacity-50 cursor-not-allowed': item.disabled }"
              @click.stop="handleSubmenuClick(item)"
            >
              <div class="flex items-center gap-2">
                <span class="w-4 h-4 flex items-center justify-center text-gray-400 group-hover/item:text-blue-500 shrink-0 relative">
                  <span v-if="item.icon" v-html="item.icon" class="flex items-center justify-center"></span>
                </span>
                <span>{{ item.label }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span v-if="item.shortcut" class="text-[10px] text-gray-400 group-hover/item:text-blue-400">{{ item.shortcut }}</span>
                <i class="fa-solid fa-chevron-right text-[10px] text-gray-400"></i>
              </div>
            </button>
            
            <!-- Submenu Dropdown -->
            <div class="absolute left-full top-0 ml-0 w-48 bg-white dark:bg-[#252526] border border-gray-200 dark:border-[#333333] shadow-xl rounded-md py-1 hidden group-hover/sub:block">
              <button 
                v-for="(subItem, subIdx) in item.children" 
                :key="subIdx"
                class="w-full text-left px-4 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-[#37373d] hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-between group/subitem"
                @click="handleItemClick(subItem)"
                :disabled="subItem.disabled"
              >
                <div class="flex items-center gap-2">
                  <span class="w-4 h-4 flex items-center justify-center text-gray-400 group-hover/subitem:text-blue-500 shrink-0 relative">
                    <span v-if="subItem.icon" v-html="subItem.icon" class="flex items-center justify-center"></span>
                  </span>
                  <span>{{ subItem.label }}</span>
                </div>
                <div class="flex items-center gap-3">
                  <span v-if="subItem.shortcut" class="text-[10px] text-gray-400 group-hover/subitem:text-blue-400">{{ subItem.shortcut }}</span>
                  <div class="w-3"></div>
                </div>
              </button>
            </div>
          </div>

          <!-- Regular Item -->
          <button 
            v-else
            class="w-full text-left px-4 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-[#37373d] hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-between group/item"
            @click="handleItemClick(item)"
            :disabled="item.disabled"
            :class="{ 'opacity-50 cursor-not-allowed': item.disabled }"
          >
            <div class="flex items-center gap-2">
              <span class="w-4 h-4 flex items-center justify-center text-gray-400 group-hover/item:text-blue-500 shrink-0 relative">
                <span v-if="item.icon" v-html="item.icon" class="flex items-center justify-center"></span>
              </span>
              <span>{{ item.label }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span v-if="item.shortcut" class="text-[10px] text-gray-400 group-hover/item:text-blue-400">{{ item.shortcut }}</span>
              <div class="w-3"></div>
            </div>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { AppAction } from '@/types'

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

interface Menu {
  id?: string
  label: string
  items: MenuItem[]
}

defineProps<{
  menus: Menu[]
}>()

const emit = defineEmits<{
  (e: 'action', action: AppAction): void
}>()

const activeMenu = ref<string | null>(null)

const toggleMenu = (label: string) => {
  if (activeMenu.value === label) {
    activeMenu.value = null
  } else {
    activeMenu.value = label
  }
}

const onMouseEnter = (label: string) => {
  if (activeMenu.value) {
    activeMenu.value = label
  }
}

const handleItemClick = (item: MenuItem) => {
  const action = item.id || item.action
  if (action) {
    emit('action', action)
  }
  activeMenu.value = null
}

const handleSubmenuClick = (item: MenuItem) => {
  const action = item.id || item.action
  if (action) {
    emit('action', action)
    activeMenu.value = null
  }
  // 如果没有 action，则不执行任何操作，由于使用了 @click.stop，菜单不会关闭
}

const closeMenu = () => {
  activeMenu.value = null
}

onMounted(() => {
  window.addEventListener('click', closeMenu)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu)
})
</script>
