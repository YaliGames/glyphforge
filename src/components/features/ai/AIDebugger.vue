<template>
  <div class="fixed bottom-6 left-6 z-[200] flex flex-col items-start gap-3">
    <!-- 悬浮开关按钮 -->
    <button 
      @click="isVisible = !isVisible"
      class="w-12 h-12 bg-[#2d2d2d] text-amber-400 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-amber-500/30"
      title="AI Debugger"
    >
      <i class="fa-solid fa-bug text-xl"></i>
    </button>

    <!-- 调试面板 -->
    <transition name="pop">
      <div v-if="isVisible" class="w-[600px] h-[450px] bg-[#1e1e1e] border border-[#333] rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl">
        <header class="px-4 h-10 border-b border-[#333] flex items-center justify-between bg-[#252525]">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold text-amber-500 uppercase tracking-widest">AI Network Traffic (Debug)</span>
          </div>
          <div class="flex items-center gap-2">
            <button @click="clearLogs" class="text-[10px] text-gray-400 hover:text-white transition-colors">CLEAR</button>
            <button @click="isVisible = false" class="text-gray-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </header>

        <div class="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[11px] custom-scrollbar" ref="logContainer">
          <div v-if="logs.length === 0" class="h-full flex flex-col items-center justify-center text-gray-600 italic">
            <i class="fa-solid fa-terminal text-2xl mb-2 opacity-20"></i>
            Waiting for traffic...
          </div>
          
          <div v-for="(log, idx) in logs" :key="idx" class="border border-[#333] rounded-lg overflow-hidden transition-all bg-[#252525]/30">
            <!-- 折叠头部 -->
            <div 
              @click="log.expanded = !log.expanded"
              class="flex items-center gap-2 p-2 cursor-pointer hover:bg-white/5 transition-colors"
            >
              <i class="fa-solid text-[10px] text-gray-500 w-4" :class="log.expanded ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
              <span :class="[
                'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0',
                log.type === 'request' ? 'bg-blue-500/20 text-blue-400' : 
                log.type === 'info' ? 'bg-amber-500/20 text-amber-400' :
                log.type === 'error' ? 'bg-red-500/20 text-red-400' :
                (log.status && log.status < 400) ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
              ]">
                {{ log.type }}
              </span>
              <span class="text-gray-500 shrink-0">{{ log.time }}</span>
              <span class="text-gray-300 truncate flex-1">
                {{ getLogSummary(log) }}
              </span>
              <span v-if="log.status" class="text-[10px] text-gray-500">{{ log.status }}</span>
            </div>

            <!-- 详细内容区域 -->
            <transition name="expand">
              <div v-if="log.expanded" class="p-3 bg-black/40 border-t border-[#333] space-y-2">
                <div v-if="log.endpoint" class="text-[10px] text-gray-500 break-all mb-2">
                  <span class="text-amber-500/50">URL:</span> {{ log.endpoint }}
                </div>
                <div class="bg-black/20 rounded p-2 border border-white/5 relative group">
                  <button @click.stop="copyToClipboard(log.content)" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-white/10 rounded hover:bg-white/20 transition-all">
                    <i class="fa-solid fa-copy text-gray-400"></i>
                  </button>
                  <pre class="text-gray-300 leading-relaxed overflow-x-auto">{{ formatJSON(log.content) }}</pre>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

interface DebugLog {
  requestId?: string;
  type: 'request' | 'response' | 'error' | 'response_stream' | 'info';
  status?: number;
  time: string;
  endpoint?: string;
  content: any;
  expanded?: boolean;
}

const isVisible = ref(false)
const logs = ref<DebugLog[]>([])
const logContainer = ref<HTMLElement | null>(null)

function getLogSummary(log: any) {
  if (log.type === 'request') {
    const messages = log.content?.messages;
    if (messages?.length > 0) {
      const lastUser = [...messages].reverse().find(m => m.role === 'user');
      return lastUser ? `User: ${lastUser.content.slice(0, 50)}...` : 'New Conversation';
    }
    return `Request: ${log.requestId || 'API'}`;
  }
  
  if (log.type === 'response') {
    if (log.aborted) return 'Request aborted by user';
    const choice = log.content?.choices?.[0];
    if (choice?.message?.content) {
      return `AI: ${choice.message.content.slice(0, 50)}...`;
    }
    return 'Full response received';
  }

  if (log.type === 'response_stream') {
    return `Streaming response... (${log.content?.length || 0} bytes)`;
  }

  if (log.type === 'info') {
    return log.content || 'System info';
  }
  
  return log.content?.message || log.content || 'Error details';
}

function formatJSON(val: any) {
  if (typeof val === 'string') {
    // 尝试识别 SSE 格式
    if (val.includes('data: ')) {
      return val.split('\n').filter(l => l.trim()).join('\n');
    }
    try { 
      const parsed = JSON.parse(val);
      return JSON.stringify(parsed, null, 2); 
    } catch { return val; }
  }
  return JSON.stringify(val, null, 2);
}

function copyToClipboard(content: any) {
  const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  navigator.clipboard.writeText(text);
}

function clearLogs() {
  logs.value = []
}

function addLog(log: any) {
  logs.value.unshift({ ...log, expanded: false })
  if (logs.value.length > 100) logs.value.pop()
  
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = 0
    }
  })
}

onMounted(() => {
  const electronAPI = (window as any).electronAPI
  if (electronAPI?.onAIDebug) {
    electronAPI.onAIDebug((data: any) => {
      // 流式片段聚合逻辑：根据 requestId 查找
      if (data.type === 'response_chunk' && data.requestId) {
        const existing = logs.value.find(l => l.requestId === data.requestId && l.type === 'response_stream');
        if (existing) {
          existing.content += data.content;
          return;
        }
        addLog({
          type: 'response_stream',
          requestId: data.requestId,
          time: new Date().toLocaleTimeString(),
          content: data.content
        });
        return;
      }

      // 如果是普通 response 且有对应的流式记录，转为正式 response
      if (data.type === 'response' && data.requestId) {
        const streamIdx = logs.value.findIndex(l => l.requestId === data.requestId && l.type === 'response_stream');
        if (streamIdx !== -1) {
          logs.value[streamIdx].type = 'response';
          logs.value[streamIdx].content = data.content;
          logs.value[streamIdx].status = data.status;
          return;
        }
      }

      addLog({
        ...data,
        time: new Date().toLocaleTimeString()
      })
    })
  }
})
</script>

<style scoped>
.pop-enter-active, .pop-leave-active {
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.pop-enter-from, .pop-leave-to {
  transform: scale(0.9) translateY(20px);
  opacity: 0;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 2px;
}
</style>
