<template>
  <Modal title="检查更新" @close="$emit('close')" :max-width="450">
    <div class="p-8 flex flex-col items-center text-center">
      <div class="w-full flex flex-col items-center space-y-4">

        <template v-if="status === 'tagged'">
          <div
            class="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 text-amber-600 rounded-full flex items-center justify-center text-2xl shadow-inner">
            <i class="fa-solid fa-flask"></i>
          </div>
          <div class="space-y-1">
            <h3 class="font-bold dark:text-white">测试版本提示</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              当前使用的是 <span
                class="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded font-mono text-xs">{{
                  APP_CONFIG.tag }}</span> 版本
            </p>
            <p class="text-xs text-gray-500 max-w-[280px] leading-relaxed">
              该版本处于开发或测试阶段，如需获取正式版本发布信息，请前往 GitHub Release 页面。
            </p>
          </div>
          <div class="flex flex-col gap-2 w-full max-w-[240px] pt-2">
            <Button @click="gotoDownloads" color="gray" class="w-full">
              查看正式版本
            </Button>
            <Button @click="$emit('close')" text color="gray" class="w-full">
              关闭
            </Button>
          </div>
        </template>

        <template v-else-if="status === 'checking'">
          <div class="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">正在获取最新版本信息...</p>
        </template>

        <template v-else-if="status === 'latest'">
          <div
            class="w-16 h-16 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-full flex items-center justify-center text-2xl shadow-inner">
            <i class="fa-solid fa-check"></i>
          </div>
          <div class="space-y-1">
            <h3 class="font-bold dark:text-white text-lg">您已是最新版本</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">当前版本: v{{ currentVersion }}</p>
          </div>
          <div class="w-full max-w-[240px] pt-2">
            <Button @click="$emit('close')" color="gray" class="w-full">
              关闭
            </Button>
          </div>
        </template>

        <template v-else-if="status === 'new-version'">
          <div
            class="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center text-2xl shadow-inner animate-bounce">
            <i class="fa-solid fa-cloud-arrow-up"></i>
          </div>

          <div class="space-y-1">
            <h3 class="font-bold dark:text-white text-lg">发现新版本: {{ latestTag }}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 font-medium">当前版本: v{{ currentVersion }}</p>
          </div>

          <div v-if="releaseNote"
            class="w-full bg-gray-50 dark:bg-black/20 rounded-xl p-4 text-left max-h-[150px] overflow-y-auto custom-scrollbar border dark:border-white/5">
            <div class="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">更新日志</div>
            <div class="text-xs leading-relaxed dark:text-gray-300 whitespace-pre-wrap">{{ releaseNote }}</div>
          </div>

          <div class="flex flex-col gap-2 w-full max-w-[240px] pt-2">
            <Button @click="gotoDownloads" color="blue" class="w-full">
              立即前往下载页面
            </Button>
            <Button @click="$emit('close')" text color="gray" class="w-full">
              以后再说
            </Button>
          </div>
        </template>

        <template v-else>
          <div
            class="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center text-2xl shadow-inner font-bold">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div class="space-y-1">
            <h3 class="font-bold dark:text-white text-lg">获取更新失败</h3>
            <p class="text-xs text-red-500/80 dark:text-red-400/80 font-medium">{{ errorMessage }}</p>
          </div>
          <div class="flex flex-col gap-2 w-full max-w-[240px] pt-2">
            <Button @click="checkUpdate" color="red" class="w-full">
              重试
            </Button>
            <Button @click="$emit('close')" text color="gray" class="w-full">
              取消
            </Button>
          </div>
        </template>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { APP_CONFIG } from '@/config/index'
import Modal from '@/components/common/Modal.vue'
import Button from '@/components/common/Button.vue'
import { useActions } from '@/composables/useActions'

defineEmits(['close'])

const { openExternalLink } = useActions()

const status = ref<'checking' | 'latest' | 'new-version' | 'error' | 'tagged'>('checking')
const currentVersion = APP_CONFIG.version
const latestTag = ref('')
const releaseNote = ref('')
const downloadUrl = ref('')
const errorMessage = ref('')

/**
 * 版本号比较
 */
function isNewer(latest: string, current: string) {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number)
  const l = parse(latest)
  const c = parse(current)

  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lVal = l[i] || 0
    const cVal = c[i] || 0
    if (lVal > cVal) return true
    if (lVal < cVal) return false
  }
  return false
}

async function checkUpdate() {
  if (APP_CONFIG.tag) {
    status.value = 'tagged'
    return
  }

  status.value = 'checking'
  try {
    const repoPath = APP_CONFIG.repo
    const response = await fetch(`https://api.github.com/repos/${repoPath}/releases/latest`)

    if (!response.ok) throw new Error(`HTTP ${response.status}: 无法获取最新版本`)

    const data = await response.json()
    latestTag.value = data.tag_name
    releaseNote.value = data.body || ''
    downloadUrl.value = data.html_url

    if (isNewer(data.tag_name, currentVersion)) {
      status.value = 'new-version'
    } else {
      status.value = 'latest'
    }
  } catch (err: any) {
    status.value = 'error'
    errorMessage.value = err.message || '网络连接异常'
  }
}

function gotoDownloads() {
  openExternalLink(APP_CONFIG.links.releases)
}

onMounted(() => {
  // 模拟请求延迟，提升体感
  setTimeout(checkUpdate, 800)
})
</script>
