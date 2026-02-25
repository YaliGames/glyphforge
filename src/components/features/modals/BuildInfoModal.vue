<template>
  <Modal 
    title="构建信息" 
    @close="$emit('close')" 
  >
    <div class="space-y-4 dark:text-gray-300 p-2 text-sm">
      <div class="grid grid-cols-2 gap-y-2.5">
        <template v-for="(item, index) in infoRows" :key="index">
          <!-- 分割线类型 -->
          <template v-if="item.type === 'separator'">
            <div class="col-span-2 my-1 border-t border-dashed dark:border-white/5"></div>
          </template>
          
          <!-- 普通数据行类型 -->
          <template v-else>
            <div class="text-gray-500">{{ item.label }}</div>
            <div class="font-mono">
              <template v-if="item.icon">
                <div class="flex items-center gap-1.5">
                  <i :class="item.icon"></i>
                  {{ item.value }}
                </div>
              </template>
              <template v-else>
                {{ item.value }}
              </template>
            </div>
          </template>
        </template>
      </div>
      
      <div class="pt-2 mt-2 border-t dark:border-[#333]">
        <div class="text-[10px] text-gray-400 mb-2 uppercase tracking-widest font-bold">仓库信息</div>
        <a 
          :href="APP_CONFIG.links.github" 
          target="_blank"
          class="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors border dark:border-white/5"
        >
          <i class="fa-brands fa-github text-base"></i>
          <div class="flex flex-col">
            <span class="text-[11px] font-bold">YaliGames/glyphforge</span>
            <span class="text-[9px] text-gray-500 underline">查看源代码</span>
          </div>
          <i class="fa-solid fa-arrow-up-right-from-square ml-auto text-[9px] text-gray-400"></i>
        </a>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { APP_CONFIG } from '@/config/index'
import Modal from '@/components/common/Modal.vue'
import { isElectron } from '@/utils/env'

defineEmits(['close'])

const platformInfo = computed(() => {
  if (!isElectron) return `Web (${navigator.platform})`
  const api = (window as any).electronAPI
  const p = api?.platform || 'unknown'
  const v = api?.systemVersion || ''
  
  const platformMap: Record<string, string> = {
    'win32': 'Windows',
    'darwin': 'macOS',
    'linux': 'Linux'
  }
  
  return `${platformMap[p] || p} ${v}`.trim()
})

const infoRows = computed(() => {
  const rows: any[] = [
    { label: '应用版本', value: APP_CONFIG.version },
    { label: '运行平台', value: platformInfo.value },
  ]

  if (isElectron) {
    const v = (window as any).electronAPI?.versions || {}
    rows.push({ type: 'separator' })
    if (v.electron) rows.push({ label: 'Electron', value: v.electron })
    if (v.chrome) rows.push({ label: 'Chromium', value: v.chrome })
    if (v.node) rows.push({ label: 'Node.js', value: v.node })
  }

  // Git 构建信息
  rows.push({ type: 'separator' })
  rows.push({ label: '当前分支', value: __GIT_BRANCH__, icon: 'fa-solid fa-code-branch' })
  rows.push({ label: '最后提交', value: __GIT_COMMIT__, icon: 'fa-solid fa-hashtag' })
  rows.push({ label: '提交时间', value: __GIT_DATE__ })
  rows.push({ label: '构建时间', value: __BUILD_TIME__ })

  return rows
})
</script>
