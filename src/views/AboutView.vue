<template>
  <div class="flex-1 overflow-y-auto bg-white dark:bg-[#1e1e1e] select-none">
    <div class="max-w-5xl mx-auto px-8 py-12">
      <!-- Header / Logo Area -->
      <header class="flex flex-col items-center text-center mb-16">
        <img 
          src="/logo.svg" 
          alt="Logo" 
          class="w-20 h-20 mb-6 group transition-transform hover:scale-105 drop-shadow-xl"
        />
        <h1 class="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2 tracking-tight">{{ APP_CONFIG.name }}</h1>
        <div class="flex items-center gap-2">
          <span 
            v-if="APP_CONFIG.tag"
            class="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider"
          >
            {{ APP_CONFIG.tag }}
          </span>
          <span class="text-sm text-gray-500 dark:text-gray-400 font-mono">v{{ APP_CONFIG.version }}</span>
        </div>
      </header>

      <!-- Main Grid Sections --> 
      <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
        <!-- Left: Resources -->
        <section class="space-y-8">
          <div>
            <h3 class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <i class="fa-solid fa-link text-[10px]"></i>
              常用资源
            </h3>
            <div class="space-y-3">
              <div 
                v-for="link in commonLinks" 
                :key="link.title" 
                @click="openExternalLink(link.url)" 
                class="group flex items-center p-3 rounded-xl border border-gray-100 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#252526] transition-all cursor-pointer"
              >
                <div class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#333] flex items-center justify-center mr-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <i :class="[link.icon, 'text-sm']"></i>
                </div>
                <div class="flex-1">
                  <div class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ link.title }}</div>
                  <div class="text-[11px] text-gray-400">{{ link.desc }}</div>
                </div>
                <i class="fa-solid fa-chevron-right text-[10px] text-gray-300 group-hover:text-blue-500 transition-colors pr-2"></i>
              </div>
            </div>
          </div>
        </section>

        <!-- Right: Help & Getting Started -->
        <section class="space-y-8">
          <div>
            <h3 class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <i class="fa-solid fa-graduation-cap text-[10px]"></i>
              快速上手
            </h3>
            <div class="space-y-6">
              <div 
                v-for="tip in tips" 
                :key="tip.title" 
                @click="openExternalLink(tip.url)"
                class="flex gap-4 p-2 -m-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[#252526] transition-all cursor-pointer group"
              >
                <div class="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 group-hover:scale-125 transition-transform"></div>
                <div>
                  <h4 class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                    {{ tip.title }}
                    <i class="fa-solid fa-arrow-up-right-from-square text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"></i>
                  </h4>
                  <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{{ tip.content }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer class="mt-20 pt-8 border-t border-gray-100 dark:border-[#333] flex flex-col items-center gap-4">
        <div class="flex gap-4 text-xs text-gray-400 dark:text-gray-500">
          <button @click="openExternalLink(APP_CONFIG.links.docs)" class="hover:text-blue-500 transition-colors">服务条款</button>
          <span class="opacity-30">|</span>
          <button @click="openExternalLink(APP_CONFIG.links.docs)" class="hover:text-blue-500 transition-colors">隐私政策</button>
          <span class="opacity-30">|</span>
          <button @click="openExternalLink(APP_CONFIG.links.github)" class="hover:text-blue-500 transition-colors">开源协议</button>
        </div>
        <p class="text-[10px] text-gray-400">Copyright &copy; {{ APP_CONFIG.copyright }}</p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { APP_CONFIG, QUICK_START_GUIDE, DESCRIPTIVE_LINKS } from '@/config'
import { useActions } from '@/composables/useActions'

const { openExternalLink } = useActions()

const commonLinks = DESCRIPTIVE_LINKS
const tips = QUICK_START_GUIDE
</script>

<style scoped>
/* 隐藏滚动条但保留功能 */
.flex-1::-webkit-scrollbar {
  width: 4px;
}
.flex-1::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}
.dark .flex-1::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
}
</style>
