<template>
  <div class="flex flex-col items-center justify-center text-center text-gray-400 p-12">
    <div
      v-if="icon"
      :class="[
        'flex items-center justify-center opacity-40 transition-all',
        circle ? `${sizeConfig.container} rounded-full bg-gray-100 dark:bg-[#252525] border dark:border-[#333]` : '',
        sizeConfig.margin
      ]"
    >
      <i :class="['fa-solid', icon, sizeConfig.icon]"></i>
    </div>
    
    <div v-if="title || subtitle" class="space-y-2">
      <h2 v-if="title" class="text-lg font-bold text-gray-700 dark:text-gray-300">
        {{ title }}
      </h2>
      
      <p v-if="subtitle" class="text-[12px] text-gray-400">
        {{ subtitle }}
      </p>
    </div>

    <div v-if="$slots.default" class="mt-4">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * 通用空状态组件
 * 用于在列表为空、未选择条目等场景展示引导信息
 */
const props = defineProps({
  // 图标类名 (FontAwesome, e.g., 'fa-user-pen')
  icon: String,
  // 标题文字
  title: String,
  // 副标题/说明文字
  subtitle: String,
  // 预设大小: xs (极小), sm (小), md (中), lg (大/默认), xl (极大)
  size: {
    type: String,
    default: 'lg',
    validator: (v: string) => ['xs', 'sm', 'md', 'lg', 'xl'].includes(v)
  },
  // 是否显示圆形背景
  circle: { type: Boolean, default: true }
})

const sizePresets = {
  'xs': { container: 'w-10 h-10', icon: 'text-xs', margin: 'mb-2' },
  'sm': { container: 'w-12 h-12', icon: 'text-sm', margin: 'mb-3' },
  'md': { container: 'w-16 h-16', icon: 'text-xl', margin: 'mb-4' },
  'lg': { container: 'w-20 h-20', icon: 'text-2xl', margin: 'mb-6' },
  'xl': { container: 'w-24 h-24', icon: 'text-4xl', margin: 'mb-8' }
}

const sizeConfig = computed(() => {
  return sizePresets[props.size as keyof typeof sizePresets] || sizePresets.lg
})
</script>
