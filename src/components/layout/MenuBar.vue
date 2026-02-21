<template>
  <div class="flex items-center h-full select-none">
    <div v-for="menu in menus" :key="menu.label" class="relative h-full flex items-center">
      <button 
        class="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-app-hover rounded transition-colors"
        :class="{ 'bg-app-hover': activeMenu === menu.label }"
        @click.stop="toggleMenu(menu.label)"
        @mouseenter="onMouseEnter(menu.label)"
      >
        {{ menu.label }}
      </button>
      
      <MenuDropdown 
        v-if="activeMenu === menu.label"
        :items="menu.items" 
        @action="handleItemAction"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { AppAction } from '@/types'
import MenuDropdown from './MenuDropdown.vue'

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

const handleItemAction = (action: AppAction) => {
  emit('action', action)
  activeMenu.value = null
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
