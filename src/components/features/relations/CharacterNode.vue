<template>
  <div class="character-node-wrapper relative group flex flex-col items-center">
    <div
      class="w-16 h-16 rounded-full flex items-center justify-center text-xl shadow-lg border-2 transition-transform duration-200"
      :class="[
        selected ? 'border-blue-500 scale-105' : 'border-white dark:border-gray-700 bg-gray-100 dark:bg-gray-800',
        connectable ? 'cursor-crosshair hover:!border-blue-400' : 'cursor-grab active:cursor-grabbing'
      ]">
      <span class="font-bold text-gray-700 dark:text-gray-200 select-none">
        {{ (data.character.name || '?').charAt(0) }}
      </span>

      <Handle id="connect-source" type="source" class="custom-handle source-handle" :connectable="connectable"
        :style="{ pointerEvents: connectable ? 'all' : 'none' }" />

      <Handle id="connect-target" type="target" class="custom-handle target-handle" :connectable="connectable"
        :style="{ pointerEvents: connectable ? 'all' : 'none' }" />
    </div>

    <div
      class="mt-2 text-xs font-bold text-gray-600 dark:text-gray-300 bg-white/80 dark:bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm select-none">
      {{ data.character.name || '未命名' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { Handle } from '@vue-flow/core'
// import type { Character } from '@/types' 

defineProps<{
  id: string
  label: string
  data: { character: any } // Character (flattened view)
  selected?: boolean
  connectable?: boolean
}>()
</script>

<style scoped>
.custom-handle {
  position: absolute;
  min-width: 0;
  min-height: 0;
  width: 1px;
  height: 1px;
  border: 0;
  border-radius: 9999px;
  background: transparent;

  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.custom-handle::after {
  content: '';
  position: absolute;
  width: 64px;
  /* w-16 */
  height: 64px;
  /* h-16 */
  border-radius: 9999px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: transparent;
}

.source-handle {
  z-index: 50;
}

.target-handle {
  z-index: 40;
}
</style>