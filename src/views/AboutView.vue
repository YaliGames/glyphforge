<template>
  <div class="flex-1 overflow-y-auto bg-white dark:bg-[#1e1e1e] select-none">
    <div class="max-w-5xl mx-auto px-8 py-12">
      <!-- Header / Logo Area -->
      <header class="flex flex-col items-center text-center mb-16">
        <div class="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-4xl font-black shadow-xl shadow-blue-500/20 mb-6 group transition-transform hover:scale-105">
          G
        </div>
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
              <a v-for="link in commonLinks" :key="link.title" :href="link.url" target="_blank" class="group flex items-center p-3 rounded-xl border border-gray-100 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#252526] transition-all">
                <div class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#333] flex items-center justify-center mr-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <i :class="[link.icon, 'text-sm']"></i>
                </div>
                <div class="flex-1">
                  <div class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ link.title }}</div>
                  <div class="text-[11px] text-gray-400">{{ link.desc }}</div>
                </div>
                <i class="fa-solid fa-chevron-right text-[10px] text-gray-300 group-hover:text-blue-500 transition-colors pr-2"></i>
              </a>
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
              <div v-for="tip in tips" :key="tip.title" class="flex gap-4">
                <div class="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5"></div>
                <div>
                  <h4 class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{{ tip.title }}</h4>
                  <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{{ tip.content }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer class="mt-20 pt-8 border-t border-gray-100 dark:border-[#333] flex flex-col items-center gap-4">
        <div class="flex gap-4 text-xs text-gray-400 dark:text-gray-500">
          <a :href="APP_CONFIG.links.docs" target="_blank" class="hover:text-blue-500">服务条款</a>
          <span class="opacity-30">|</span>
          <a :href="APP_CONFIG.links.docs" target="_blank" class="hover:text-blue-500">隐私政策</a>
          <span class="opacity-30">|</span>
          <a :href="APP_CONFIG.links.github" target="_blank" class="hover:text-blue-500">开源协议</a>
        </div>
        <p class="text-[10px] text-gray-400">Copyright &copy; {{ APP_CONFIG.copyright }}</p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { APP_CONFIG } from '@/config'

const commonLinks = [
  { title: '官方文档', desc: '学习如何使用大纲与实体交互', icon: 'fa-solid fa-book', url: APP_CONFIG.links.docs },
  { title: 'GitHub', desc: '参与开发、报告 Bug 或提出建议', icon: 'fa-brands fa-github', url: APP_CONFIG.links.github },
  { title: '更新日志', desc: '查看 Alpha 阶段的每一项改进', icon: 'fa-solid fa-clock-rotate-left', url: APP_CONFIG.links.releases },
  { title: '反馈社区', desc: '与其他创作者交流使用心得', icon: 'fa-solid fa-comment-dots', url: APP_CONFIG.links.feedback },
]

const tips = [
  { title: '', content: '' },
]
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
