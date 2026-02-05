<template>
  <transition name="slide-right">
    <div v-if="aiStore.isVisible" class="fixed right-0 top-10 bottom-6 w-[400px] bg-white dark:bg-[#1e1e1e] border-l dark:border-[#333] shadow-2xl z-[100] flex flex-col overflow-hidden">
      <!-- 头部 -->
      <header class="h-14 border-b dark:border-[#333] px-4 flex items-center justify-between bg-gray-50/50 dark:bg-[#252525]/50 backdrop-blur-md shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
          </div>
          <div class="flex flex-col">
            <span class="text-[11px] font-bold dark:text-gray-200 leading-none">AI 创作助手</span>
            <span class="text-[9px] text-gray-400 mt-1 uppercase tracking-wider">{{ settingsStore.activeAIProfile?.name }}</span>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button 
            @click="goToSettings('ai')" 
            class="p-2 hover:bg-gray-200 dark:hover:bg-[#333] rounded-lg transition-all text-gray-400 group"
            title="AI 设置"
          >
            <i class="fa-solid fa-gear text-sm group-hover:rotate-45 transition-transform"></i>
          </button>
          <button @click="aiStore.toggle" class="p-2 hover:bg-gray-200 dark:hover:bg-[#333] rounded-lg transition-all text-gray-400">
            <i class="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>
      </header>

      <!-- 中间内容区容器 -->
      <div class="flex-1 relative overflow-hidden">
        <!-- 聊天记录滚动区 -->
        <div class="absolute inset-0 overflow-y-auto p-4 space-y-6 custom-scrollbar flex flex-col pb-8" ref="historyBox">
          <EmptyState
            v-if="aiStore.history.length === 0"
            icon="fa-comment-dots"
            size="xl"
            :circle="false"
            subtitle="选择要提供给AI参考内容，并开始对话"
          />

          <div v-for="msg in aiStore.history" :key="msg.id" class="flex flex-col gap-2 shrink-0" :class="msg.role === 'user' ? 'items-end' : 'items-start'">
            <div class="flex items-center gap-2 px-1 text-[10px] text-gray-400 w-full" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
               <i :class="msg.role === 'user' ? 'fa-solid fa-user' : 'fa-solid fa-robot'"></i>
               <span>{{ msg.role === 'user' ? '你' : 'G-Forge AI' }}</span>
               
               <!-- 参考标记 -->
               <div v-if="msg.references && Object.keys(msg.references).length > 0" class="ml-auto flex items-center gap-1 text-[9px] bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full text-purple-600 border border-purple-100 dark:border-purple-800">
                 <i class="fa-solid fa-link text-[8px]"></i>
                 <span>参考了 {{ Object.keys(msg.references).length }} 项数据</span>
                 <button @click="showRawData(msg.references)" class="hover:text-purple-800 transition-colors">
                   <i class="fa-solid fa-circle-info cursor-help"></i>
                 </button>
               </div>
            </div>
            
            <div 
              class="max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative group/msg"
              :class="msg.role === 'user' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10' : 'bg-gray-100 dark:bg-[#2d2d2d] dark:text-gray-200'"
            >
              <!-- 文本内容区 -->
              <template v-if="msg.type === 'json' && parseAIResponse(msg.content)">
                 <div class="space-y-4">
                  <!-- 创作内容区 -->
                  <div class="space-y-2">
                    <div class="flex items-center gap-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      <i class="fa-solid fa-feather-pointed"></i>
                      创作结果
                    </div>
                    <div v-if="parseAIResponse(msg.content)?.creative?.text" class="whitespace-pre-wrap text-[13px] leading-relaxed italic bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-black/5 dark:border-white/5">
                      {{ parseAIResponse(msg.content).creative.text }}
                    </div>
                    <div v-if="parseAIResponse(msg.content)?.creative?.data" class="bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-black/5 dark:border-white/5">
                      <pre class="text-[11px] font-mono overflow-x-auto">{{ JSON.stringify(parseAIResponse(msg.content).creative.data, null, 2) }}</pre>
                    </div>
                  </div>

                  <!-- 导入按钮 -->
                  <div v-if="parseAIResponse(msg.content)?.creative?.data" class="flex justify-end">
                     <button @click="importAIResult(msg.content)" class="text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-all shadow-md font-bold active:scale-95">
                       <i class="fa-solid fa-file-import text-[9px]"></i>
                       同步数据
                     </button>
                  </div>

                  <!-- 逻辑分析区 -->
                  <div v-if="parseAIResponse(msg.content)?.analytical" class="space-y-3 pt-2 border-t dark:border-white/5">
                    <div v-if="parseAIResponse(msg.content).analytical.suggestions?.length" class="space-y-2 mt-3">
                      <div class="flex items-center gap-2 text-[10px] font-bold text-purple-500/70 uppercase tracking-widest">
                        <i class="fa-solid fa-lightbulb"></i>
                        创作建议
                      </div>
                      <div class="flex flex-wrap gap-1.5">
                        <div v-for="(sug, idx) in parseAIResponse(msg.content).analytical.suggestions" :key="idx"
                          class="px-2 py-1 rounded-lg bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/10 text-[10px] text-purple-600 dark:text-purple-400">
                          {{ sug }}
                        </div>
                      </div>
                    </div>

                    <div v-if="parseAIResponse(msg.content).analytical.warnings?.length" class="space-y-2 mt-3">
                      <div class="flex items-center gap-2 text-[10px] font-bold text-amber-500/70 uppercase tracking-widest">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        设定冲突
                      </div>
                      <div class="space-y-1">
                        <div v-for="(warn, idx) in parseAIResponse(msg.content).analytical.warnings" :key="idx"
                          class="text-[11px] text-amber-600 dark:text-amber-400/80 pl-2 border-l-2 border-amber-500/30">
                          {{ warn }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="markdown-content" v-html="renderMarkdown(msg.content)"></div>
              </template>

              <!-- 智能建议操作卡片 -->
              <div v-if="msg.toolCalls && msg.toolCalls.length > 0" class="mt-4 space-y-2.5">
                 <div v-for="call in msg.toolCalls" :key="call.id" 
                   class="group/tool relative border transition-all duration-200"
                   :class="[
                     aiStore.executedToolCallIds.has(call.id) 
                      ? 'bg-transparent border-gray-200 dark:border-white/5 opacity-60' 
                      : 'bg-[#f8f9fb] dark:bg-[#252526] border-[#e1e4e8] dark:border-[#3e3e42] rounded-lg shadow-sm'
                   ]"
                 >
                    <div class="flex items-start p-3 gap-3">
                       <!-- 状态图标 -->
                       <div class="mt-0.5 shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px]"
                         :class="aiStore.executedToolCallIds.has(call.id) ? 'text-green-500' : 'text-blue-500 bg-blue-500/5 dark:bg-blue-400/10'"
                       >
                         <i :class="aiStore.executedToolCallIds.has(call.id) ? 'fa-solid fa-square-check' : 'fa-solid fa-terminal'"></i>
                       </div>
                       
                       <div class="flex-1 min-w-0">
                         <div class="flex items-center justify-between gap-2 mb-1">
                           <span class="text-[11px] font-mono font-bold tracking-tight uppercase opacity-80" :class="aiStore.executedToolCallIds.has(call.id) ? 'text-gray-500' : 'text-blue-600 dark:text-blue-400'">
                             {{ call.function.name }}
                           </span>
                           <div v-if="!aiStore.executedToolCallIds.has(call.id)" class="flex gap-1">
                             <button 
                               @click.stop="showRawData({ name: call.function.name, arguments: call.function.arguments })"
                               class="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                             >
                               显示参数
                             </button>
                           </div>
                         </div>

                         <div class="text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
                           <span v-if="aiStore.executedToolCallIds.has(call.id)" class="italic opacity-70">任务已完成：</span>
                           {{ getToolSummary(call) }}
                         </div>

                         <div v-if="!aiStore.executedToolCallIds.has(call.id)" class="mt-3 flex gap-2">
                           <button 
                             @click="handleApplyTool(msg.id, call)"
                             class="text-[10px] bg-[#007acc] hover:bg-[#0062a3] text-white px-3 py-1 rounded transition-colors font-bold shadow-sm flex items-center gap-1.5"
                           >
                             <i class="fa-solid fa-bolt-lightning text-[9px]"></i>
                             执行修改
                           </button>
                         </div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          <!-- 处理中表现 -->
          <div v-if="aiStore.isProcessing" class="flex flex-col gap-2 items-start shrink-0">
            <div class="flex items-center justify-between gap-2 px-1 text-[10px] text-gray-400 w-full">
               <div class="flex items-center gap-2">
                 <i class="fa-solid fa-robot animate-pulse"></i>
                 <span>G-Forge AI 正在思考...</span>
               </div>
               <button 
                 @click="aiStore.stopGeneration"
                 class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors border border-red-100 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400 text-[9px] font-bold"
               >
                 <i class="fa-solid fa-stop text-[8px]"></i>
                 终止生成
               </button>
            </div>
            <div class="bg-gray-100 dark:bg-[#2d2d2d] rounded-2xl px-4 py-3 flex gap-1">
              <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
              <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        </div>

        <!-- 面板覆盖层 (不再作为滚动区的子项) -->
        <transition name="panel-slide">
          <div v-if="activePanel" class="absolute inset-0 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-md z-40 flex flex-col shadow-inner overflow-hidden">
            <header class="h-12 border-b dark:border-[#333] px-4 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-[#252525]/50">
              <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <i :class="[
                  activePanel === 'context' ? 'fa-solid fa-database text-blue-500' : 'fa-solid fa-wand-sparkles text-purple-500'
                ]"></i>
                {{ activePanel === 'context' ? '参考上下文配置' : '指令模板库' }}
              </span>
              <div class="flex items-center gap-1">
                <button v-if="activePanel === 'prompts'" @click="uiStore.openModal('prompt-library')" class="w-8 h-8 flex items-center justify-center hover:bg-purple-100 dark:hover:bg-purple-900/20 rounded-lg text-purple-500 transition-colors" title="管理库">
                  <i class="fa-solid fa-gear text-xs"></i>
                </button>
                <button @click="activePanel = null" class="w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#333] rounded-lg text-gray-400">
                  <i class="fa-solid fa-chevron-down text-sm"></i>
                </button>
              </div>
            </header>
            
            <div class="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
              <!-- 参考内容配置面板 -->
              <div v-if="activePanel === 'context'" class="space-y-8">
                <!-- 基础信息组 -->
                <div class="space-y-3">
                  <div class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase px-1 tracking-wider">基础 & 备忘</div>
                  <div class="grid grid-cols-2 gap-3">
                    <button 
                      v-for="val in ['project', 'authorNotes']" 
                      :key="val"
                      @click="toggleContext(val)"
                      class="flex items-center justify-between p-3 rounded-2xl border text-left transition-all hover:shadow-md relative"
                      :class="aiStore.referenceKeys.includes(val) 
                        ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800 ring-2 ring-purple-100/50 dark:ring-purple-900/30' 
                        : 'bg-white dark:bg-[#252525] border-gray-100 dark:border-white/5 shadow-sm'"
                    >
                      <div class="flex items-center gap-3">
                        <i class="text-xs" :class="[
                          val === 'project' ? 'fa-solid fa-file-invoice' : 'fa-solid fa-note-sticky',
                          aiStore.referenceKeys.includes(val) ? 'text-purple-600' : 'text-gray-400'
                        ]"></i>
                        <span class="text-[11px] font-bold" :class="aiStore.referenceKeys.includes(val) ? 'text-purple-700' : 'text-gray-600 dark:text-gray-400'">
                          {{ findNodeByValue(val)?.label }}
                        </span>
                      </div>
                      <!-- 红点数量 -->
                      <span v-if="aiStore.referenceKeys.includes(val)" 
                        class="text-[9px] bg-red-500 text-white min-w-[14px] h-[14px] flex items-center justify-center rounded-full px-1 shadow-sm font-bold scale-90"
                      >
                        1
                      </span>
                    </button>
                  </div>
                </div>

                <!-- 正文结构组 -->
                <div class="space-y-3">
                  <div class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase px-1 tracking-wider">正文 & 结构</div>
                  <div class="space-y-4">
                    <div v-for="val in ['manuscript', 'outline', 'chapters']" :key="val" class="space-y-2">
                      <button 
                        @click="toggleContext(val)"
                        class="w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all hover:shadow-md group"
                        :class="aiStore.referenceKeys.includes(val) 
                          ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800 ring-2 ring-blue-100/50 dark:ring-blue-900/30' 
                          : 'bg-white dark:bg-[#252525] border-gray-100 dark:border-white/5 shadow-sm'"
                      >
                        <div class="flex items-center gap-3 truncate">
                          <i class="text-xs" :class="[
                            val === 'manuscript' ? 'fa-solid fa-pen-nib' : val === 'outline' ? 'fa-solid fa-diagram-project' : 'fa-solid fa-list-ul',
                            aiStore.referenceKeys.includes(val) ? 'text-blue-600' : 'text-gray-400'
                          ]"></i>
                          <span class="text-[11px] font-bold truncate" :class="aiStore.referenceKeys.includes(val) ? 'text-blue-700' : 'text-gray-600 dark:text-gray-400'">
                            {{ findNodeByValue(val)?.label }}
                          </span>
                        </div>
                        
                        <div class="flex items-center gap-2">
                          <!-- 红点数量 -->
                          <span v-if="granularSelections[val]?.length > 0" 
                            class="text-[9px] bg-red-500 text-white min-w-[14px] h-[14px] flex items-center justify-center rounded-full px-1 shadow-sm font-bold scale-90"
                          >
                            {{ granularSelections[val].length }}
                          </span>
                          <i v-if="findNodeByValue(val)?.isGranular" 
                            class="fa-solid fa-chevron-right text-[8px] text-gray-300 group-hover:translate-x-0.5 transition-transform"
                            :class="{ 'rotate-90': expandedKeys.includes(val) }"
                          ></i>
                        </div>
                      </button>
                      
                      <!-- 在其下方展开筛选框 -->
                      <div v-if="expandedKeys.includes(val) && findNodeByValue(val)?.isGranular" 
                           class="bg-indigo-50/30 dark:bg-indigo-900/5 border border-indigo-100/50 dark:border-indigo-800/30 rounded-2xl p-3 shadow-inner">
                        <div class="mb-2 flex items-center justify-between">
                          <div class="text-[9px] font-bold text-indigo-400 dark:text-indigo-500/50 uppercase tracking-widest flex items-center gap-2">
                            <i class="fa-solid fa-filter text-[8px]"></i>
                            针对 {{ findNodeByValue(val)?.label }} 的筛选
                          </div>
                          <!-- 全选按钮 (手稿正文不显示) -->
                          <button 
                            v-if="val !== 'manuscript'"
                            @click="toggleSelectAll(val)"
                            class="text-[9px] font-bold px-2 py-0.5 rounded bg-white dark:bg-black/20 border dark:border-white/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                          >
                            {{ (granularSelections[val]?.length || 0) === getOptionsForValue(val).length ? '取消全选' : '全选' }}
                          </button>
                        </div>
                        <div class="grid grid-cols-2 gap-1.5 max-h-[130px] overflow-y-auto custom-scrollbar pr-1">
                          <button 
                            v-for="item in getOptionsForValue(val)" 
                            :key="item.id"
                            @click="toggleGranularItem(val, item.id)"
                            class="px-2 py-1.5 rounded-lg text-[10px] border transition-all truncate text-left"
                            :class="granularSelections[val]?.includes(item.id) 
                              ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' 
                              : 'bg-white dark:bg-[#111] border-gray-100 dark:border-white/5 text-gray-500'"
                          >
                            {{ item.label }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 世界角色组 -->
                <div class="space-y-3">
                  <div class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase px-1 tracking-wider">世界 & 角色</div>
                  <div class="space-y-4">
                    <div v-for="val in ['worldview_categories', 'worldview_timeline', 'characters']" :key="val" class="space-y-2">
                      <button 
                        @click="toggleContext(val)"
                        class="w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all hover:shadow-md group"
                        :class="aiStore.referenceKeys.includes(val) 
                          ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800 ring-2 ring-orange-100/50 dark:ring-orange-900/30' 
                          : 'bg-white dark:bg-[#252525] border-gray-100 dark:border-white/5 shadow-sm'"
                      >
                        <div class="flex items-center gap-3 truncate">
                          <i class="text-xs" :class="[
                            val === 'worldview_categories' ? 'fa-solid fa-earth-asia' : val === 'worldview_timeline' ? 'fa-solid fa-clock-rotate-left' : 'fa-solid fa-users',
                            aiStore.referenceKeys.includes(val) ? 'text-orange-600' : 'text-gray-400'
                          ]"></i>
                          <span class="text-[11px] font-bold truncate" :class="aiStore.referenceKeys.includes(val) ? 'text-orange-700' : 'text-gray-600 dark:text-gray-400'">
                            {{ findNodeByValue(val)?.label }}
                          </span>
                        </div>
                        
                        <div class="flex items-center gap-2">
                          <!-- 红点数量 -->
                          <span v-if="granularSelections[val]?.length > 0" 
                            class="text-[9px] bg-red-500 text-white min-w-[14px] h-[14px] flex items-center justify-center rounded-full px-1 shadow-sm font-bold scale-90"
                          >
                            {{ granularSelections[val].length }}
                          </span>
                          <i v-if="findNodeByValue(val)?.isGranular" 
                            class="fa-solid fa-chevron-right text-[8px] text-gray-300 group-hover:translate-x-0.5 transition-transform"
                            :class="{ 'rotate-90': expandedKeys.includes(val) }"
                          ></i>
                        </div>
                      </button>

                      <div v-if="expandedKeys.includes(val) && findNodeByValue(val)?.isGranular" 
                           class="bg-indigo-50/30 dark:bg-indigo-900/5 border border-indigo-100/50 dark:border-indigo-800/30 rounded-2xl p-3 shadow-inner">
                        <div class="mb-2 flex items-center justify-between">
                          <div class="text-[9px] font-bold text-indigo-400 dark:text-indigo-500/50 uppercase tracking-widest flex items-center gap-2">
                            <i class="fa-solid fa-filter text-[8px]"></i>
                            针对 {{ findNodeByValue(val)?.label }} 的筛选 
                          </div>
                          <!-- 全选按钮 (手稿正文不显示) -->
                          <button 
                            v-if="val !== 'manuscript'"
                            @click="toggleSelectAll(val)"
                            class="text-[9px] font-bold px-2 py-0.5 rounded bg-white dark:bg-black/20 border dark:border-white/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                          >
                            {{ (granularSelections[val]?.length || 0) === getOptionsForValue(val).length ? '取消全选' : '全选' }}
                          </button>
                        </div>
                        <div class="grid grid-cols-2 gap-1.5 max-h-[130px] overflow-y-auto custom-scrollbar pr-1">
                          <button 
                            v-for="item in getOptionsForValue(val)" 
                            :key="item.id"
                            @click="toggleGranularItem(val, item.id)"
                            class="px-2 py-1.5 rounded-lg text-[10px] border transition-all truncate text-left"
                            :class="granularSelections[val]?.includes(item.id) 
                              ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' 
                              : 'bg-white dark:bg-[#111] border-gray-100 dark:border-white/5 text-gray-500'"
                          >
                            {{ item.label }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 指令模板列表 -->
              <div v-if="activePanel === 'prompts'" class="space-y-4 pb-12">
                <div v-for="p in aiStore.allPrompts" :key="p.id" 
                  @click="selectedPromptId = p.id; activePanel = null"
                  class="p-4 rounded-3xl border transition-all cursor-pointer group hover:shadow-xl hover:-translate-y-0.5 relative"
                  :class="selectedPromptId === p.id 
                    ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800 ring-2 ring-purple-100 dark:ring-purple-900/20' 
                    : 'bg-white dark:bg-[#252525] border-gray-100 dark:border-white/5 shadow-sm'"
                >
                  <div class="flex justify-between items-start mb-1">
                    <div class="flex items-center gap-2">
                       <i class="fa-solid" :class="[
                         p.id.startsWith('builtin-') ? 'fa-shield-halved text-[9px] text-blue-400' : 'fa-wand-magic-sparkles text-[10px]',
                         selectedPromptId === p.id ? 'text-purple-600' : 'text-gray-400'
                       ]"></i>
                       <span class="text-[11px] font-bold" :class="selectedPromptId === p.id ? 'text-purple-700' : 'text-gray-600 dark:text-gray-400'">
                        {{ p.label }}
                       </span>
                    </div>
                    <span class="text-[8px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-black/20 text-gray-400 uppercase tracking-tighter">
                      {{ p.category }}
                    </span>
                  </div>
                  <p class="text-[10px] text-gray-400 leading-relaxed italic line-clamp-2">
                    {{ p.description }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>


      <!-- 输入区 -->
      <footer class="p-4 border-t dark:border-[#333] bg-gray-50/50 dark:bg-[#252525]/50 backdrop-blur-md shrink-0">
        <!-- 辅助操作菜单 -->
        <div class="flex items-center gap-2 mb-3 px-1">
          <button 
            @click="activePanel = activePanel === 'prompts' ? null : 'prompts'"
            class="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-xl border text-[10px] font-bold transition-all"
            :class="activePanel === 'prompts' 
              ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20' 
              : 'bg-white dark:bg-[#1e1e1e] border-gray-100 dark:border-white/5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'"
          >
            <i class="fa-solid fa-wand-sparkles text-[9px]"></i>
            {{ selectedPromptId ? (aiStore.allPrompts.find(p => p.id === selectedPromptId)?.label || '指令模板') : '选择指令模板' }}
          </button>

          <button 
            @click="activePanel = activePanel === 'context' ? null : 'context'"
            class="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-xl border text-[10px] font-bold transition-all relative"
            :class="activePanel === 'context' 
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' 
              : 'bg-white dark:bg-[#1e1e1e] border-gray-100 dark:border-white/5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'"
          >
            <i class="fa-solid fa-database text-[9px]"></i>
            参考上下文
            <span v-if="aiStore.referenceKeys.length > 0" class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full border-2 border-white dark:border-[#252525]">
              {{ aiStore.referenceKeys.length }}
            </span>
          </button>
        </div>

        <div class="relative group">
          <textarea 
            v-model="input"
            rows="3"
            class="w-full bg-white dark:bg-[#1e1e1e] border dark:border-[#444] rounded-xl pl-3 pr-12 py-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all resize-none shadow-sm group-hover:border-gray-300 dark:group-hover:border-[#555]"
            placeholder="输入对话或指令..."
            @keydown.enter.ctrl.exact="send"
          ></textarea>
          <button 
            @click="send"
            :disabled="!input.trim() || aiStore.isProcessing"
            class="absolute bottom-3 right-3 w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center hover:bg-purple-700 disabled:opacity-30 disabled:hover:bg-purple-600 transition-all shadow-lg shadow-purple-500/20"
          >
            <i class="fa-solid fa-arrow-up text-xs"></i>
          </button>
        </div>
        <div class="mt-2 flex justify-between items-center">
          <button v-if="selectedPromptId" @click="selectedPromptId = ''" class="text-[9px] text-purple-400 hover:text-purple-600 transition-colors">
            清除当前模板
          </button>
          <div class="ml-auto text-[9px] text-gray-400">Ctrl + Enter 发送</div>
        </div>
      </footer>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { marked } from 'marked'
import { useAIStore } from '@/store/ai'
import { useProjectStore } from '@/store/project'
import { useCharacterStore } from '@/store/characters'
import { useUIStore } from '@/store/ui'
import { useSettingsStore } from '@/store/settings'
import { PROJECT_REFERENCE_TREE, type ReferenceNode, type AIToolCall } from '@/types'
import { AI_TOOLS } from '@/core/ai/tool-definitions'
import EmptyState from '@/components/common/EmptyState.vue'
import { useRouter } from 'vue-router'

const aiStore = useAIStore()
const projectStore = useProjectStore()
const characterStore = useCharacterStore()
const uiStore = useUIStore()
const settingsStore = useSettingsStore()
const router = useRouter()

const input = ref('')
const historyBox = ref<HTMLElement | null>(null)
const activePanel = ref<'context' | 'prompts' | null>(null)

function renderMarkdown(content: string) {
  try {
    return marked.parse(content || '')
  } catch (e) {
    return content
  }
}

function parseAIResponse(content: string) {
  if (!content) return null;
  try {
    // 提取可能的 JSON 块
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

function importAIResult(content: string) {
  uiStore.showToast('请通过下方的“建议操作”卡片进行精准数据变更。', 'info')
}

// --- 从 Store 同步状态 ---
const selectedPromptId = computed({
  get: () => aiStore.selectedPromptId,
  set: (val) => aiStore.selectedPromptId = val
})

const granularSelections = computed({
  get: () => aiStore.granularSelections,
  set: (val) => aiStore.granularSelections = val
})

const expandedKeys = ref<string[]>([]) // 记录哪些精细化类目处于展开状态

function getOptionsForValue(val: string) {
  return aiStore.getContextOptions(val)
}

function findNodeByValue(targetValue: string, nodes: ReferenceNode[] = PROJECT_REFERENCE_TREE): ReferenceNode | null {
  for (const node of nodes) {
    if (node.value === targetValue) return node
    if (node.children) {
      const found = findNodeByValue(targetValue, node.children)
      if (found) return found
    }
  }
  return null
}

function toggleContext(value: string) {
  const node = findNodeByValue(value)
  if (node?.isGranular) {
    // 精细化类目：点击卡片仅切换展开/收起状态 (无论当前是否在 referenceKeys 中)
    const idx = expandedKeys.value.indexOf(value)
    if (idx === -1) expandedKeys.value.push(value)
    else expandedKeys.value.splice(idx, 1)
  } else {
    // 非精细化类目：传统的勾选切换
    const index = aiStore.referenceKeys.indexOf(value)
    if (index === -1) {
      aiStore.referenceKeys.push(value)
    } else {
      aiStore.referenceKeys.splice(index, 1)
    }
  }
}

function syncCategorySelection(key: string) {
  const hasItems = (granularSelections.value[key]?.length || 0) > 0
  const refIdx = aiStore.referenceKeys.indexOf(key)
  
  if (hasItems) {
    if (refIdx === -1) aiStore.referenceKeys.push(key)
  } else {
    // 如果子项全部清空，则该大类也不再视为 active (除非非精细化类目由 toggleContext 控制)
    if (refIdx !== -1) aiStore.referenceKeys.splice(refIdx, 1)
  }
}

function toggleGranularItem(key: string, id: string) {
  if (!granularSelections.value[key]) granularSelections.value[key] = []
  
  const index = granularSelections.value[key].indexOf(id)
  if (index === -1) {
    granularSelections.value[key].push(id)
  } else {
    granularSelections.value[key].splice(index, 1)
  }
  syncCategorySelection(key)
}

function toggleSelectAll(key: string) {
  const options = getOptionsForValue(key)
  const currentSelected = granularSelections.value[key] || []
  
  if (currentSelected.length === options.length) {
    granularSelections.value[key] = []
  } else {
    granularSelections.value[key] = options.map(o => o.id)
  }
  syncCategorySelection(key)
}

function showRawData(refs: any) {
  uiStore.openModal('ai-snapshot', refs)
}

// --- AI 上下文统一处理引擎 ---
/**
 * 负责将原始项目数据转换为 AI 易于理解、无技术噪音、且带有语义说明的上下文快照。
 */
const ContextEngine = {
  // 定义需要从发送给 AI 的数据中保留的核心标识字段
  IDENTITY_KEYS: ['id', 'type', 'name'],
  // 定义需要剔除的技术冗余字段
  TECHNICAL_KEYS: ['order', 'range', 'anchorLineNumber', 'linkedChapters', 'projectId', 'depth'],

  /**
   * 深度递归处理数据，清理技术字段并保持结构清晰
   * 额外优化：如果对象包含 base 属性且 base 中有 name，则将其提升至顶层，便于 AI 关联 ID 和名称
   */
  cleanData(data: any): any {
    if (Array.isArray(data)) return data.map(item => this.cleanData(item));
    if (data && typeof data === 'object') {
      let source = data;
      // 自动摊平角色等带有 base 属性的数据
      if (data.base && typeof data.base === 'object') {
        source = { 
          id: data.id, 
          type: data.type, 
          ...data.base,
          ...data 
        };
        delete (source as any).base;
      }

      const cleaned: any = {};
      for (const [key, value] of Object.entries(source)) {
        // 保留核心标识
        if (this.IDENTITY_KEYS.includes(key)) {
          cleaned[key] = value;
          continue;
        }
        // 剔除技术冗余
        if (this.TECHNICAL_KEYS.includes(key)) continue;
        // 剔除空值/函数
        if (value === null || value === undefined || typeof value === 'function') continue;
        
        cleaned[key] = this.cleanData(value);
      }
      return cleaned;
    }
    return data;
  },

  /**
   * 针对不同模块的专用处理器
   */
  handlers: {
    manuscript: (bundle: any, selections: string[]) => {
      const manuscript = bundle.manuscript.content || [];
      if (!selections || selections.length === 0) return manuscript;

      const selectedContent: string[] = [];
      const allAnchorLines: number[] = [];
      const collectAnchors = (items: any[]) => {
        items.forEach(c => {
          if (typeof c.anchorLineNumber === 'number') allAnchorLines.push(c.anchorLineNumber);
          if (c.children) collectAnchors(c.children);
        });
      };
      collectAnchors(bundle.chapters);
      allAnchorLines.sort((a, b) => a - b);

      selections.forEach(chapterId => {
        const findChapter = (items: any[]): any => {
          for (const item of items) {
            if (item.id === chapterId) return item;
            if (item.children) {
              const found = findChapter(item.children);
              if (found) return found;
            }
          }
          return null;
        };
        const chapter = findChapter(bundle.chapters);
        if (chapter && typeof chapter.anchorLineNumber === 'number') {
          const startIdx = chapter.anchorLineNumber - 1;
          const nextAnchor = allAnchorLines.find(line => line > chapter.anchorLineNumber);
          const endIdx = nextAnchor ? nextAnchor - 1 : manuscript.length;
          selectedContent.push(`[章节: ${chapter.title}]`);
          selectedContent.push(...manuscript.slice(startIdx, endIdx));
        }
      });
      return selectedContent;
    },

    outline: (bundle: any, selections: string[]) => {
      const allActs = bundle.outline.structure.acts;
      const content = bundle.outline.content || [];
      const targetActs = selections && selections.length > 0 
        ? allActs.filter((a: any) => selections.includes(a.id))
        : allActs;

      return targetActs.map((act: any) => {
        const { id, range, order, linkedChapters, ...rest } = act;
        const result: any = { ...rest };
        if (act.range) {
          result.textSegments = content.slice(act.range.startLine - 1, act.range.endLine);
        }
        return result;
      });
    },

    generic: (rawValue: any, selections: string[]) => {
      if (!Array.isArray(rawValue)) return rawValue;
      const filtered = selections && selections.length > 0
        ? rawValue.filter((item: any) => selections.includes(item.id) || selections.includes(item.type))
        : rawValue;
      return filtered;
    }
  },

  /**
   * 自动生成语义化的字段解释文档
   */
  generateExplanation(node: ReferenceNode, isGranularActive: boolean): string {
    let lines = [
      `#### 模块: ${node.label} (${node.value}) ####`, 
      `* 功能描述: ${node.description}`,
      `* 重要提示: 调用工具修改或删除此模块内容时，必须使用下方数据中的 "id" 字段作为唯一标识。`
    ];
    
    // 获取需要解释的字段集
    let targetNodes = node.children || [];
    if (isGranularActive) {
      const subNode = targetNodes.find(n => n.value === 'acts' || n.value === 'content' || n.isGranular);
      if (subNode && subNode.children) targetNodes = subNode.children;
    }

    if (targetNodes.length > 0) {
      lines.push(`* 关键字段定义:`);
      targetNodes.forEach(child => {
        if (this.TECHNICAL_KEYS.includes(child.value)) return;
        lines.push(`  - ${child.value}: ${child.description}`);
      });
    //   if (node.value === 'outline') lines.push(`  - textSegments: 该幕在大纲中对应的具体文字叙述`);
    }
    return lines.join('\n');
  }
};

// --- 工具解析辅助 ---
function getToolLabel(name: string) {
  const tool = AI_TOOLS.find(t => t.name === name)
  return tool?.description.split('：')[0] || name
}

function getToolSummary(call: AIToolCall) {
  try {
    const rawArgs = call.function.arguments
    if (!rawArgs) return '正在分析意图...'
    
    let args: any
    try {
      args = JSON.parse(rawArgs)
    } catch (e) {
      if (rawArgs.length > 20) return `正在生成操作详情: ${rawArgs.slice(0, 50)}...`
      return '解析参数中...'
    }

    if (call.function.name === 'edit_text_block') {
      const search = (args.search_text || '')
      const replace = (args.replace_text || '')
      return `精准修改正文内容，将 "${search.length > 20 ? search.slice(0, 20) + '...' : search}" 修正为符合设定的描述。`
    }
    if (call.function.name === 'upsert_entities') {
      const typeMap: Record<string, string> = { 'character': '角色', 'worldview': '世界观', 'relationship': '关系', 'timeline': '时间线' }
      const labels = (args.entities || []).map((e: any) => e.name || e.id).filter(Boolean)
      return `同步 ${typeMap[args.type] || args.type} 数据：${labels.length > 0 ? labels.join('、') : '新项'}`
    }
    if (call.function.name === 'delete_entities') {
      return `从工程中移除 ${args.ids?.length || 0} 个指定的实体系目。`
    }
    return `执行系统指令: ${call.function.name}`
  } catch (e) {
    return '解析任务详情时出错'
  }
}

async function handleApplyTool(messageId: string, call: AIToolCall) {
  console.group(`[AI Tool Engine] Applying: ${call.function.name}`);
  console.log('Raw Arguments:', call.function.arguments);

  const ok = await uiStore.showConfirm({
    title: '确认执行 AI 操作',
    message: `AI 建议执行 “${getToolLabel(call.function.name)}”，是否继续？`,
    confirmText: '确认执行'
  })

  if (!ok) {
    console.log('User cancelled the operation');
    console.groupEnd();
    return;
  }

  try {
    const args = JSON.parse(call.function.arguments)
    console.log('Parsed Arguments:', args);
    let result = ''
    let isSuccess = false

    projectStore.takeSnapshot()

    if (call.function.name === 'edit_text_block') {
      const { search_text, replace_text } = args
      console.log(`Searching for: "${search_text}"`);
      
      // 1. 尝试在大纲中寻找并替换
      const fullOutline = (projectStore.bundle?.outline.content || []).join('\n')
      if (fullOutline.includes(search_text)) {
        console.log('Found match in Outline');
        const nextFull = fullOutline.replace(search_text, replace_text)
        projectStore.bundle!.outline.content = nextFull.split('\n')
        result = '已成功更新大纲文本段落'
        isSuccess = true
      } else {
        console.log('No match in Outline, checking Manuscript...');
        // 2. 尝试在正文中寻找并替换
        const fullManuscript = (projectStore.bundle?.manuscript.content || []).join('\n')
        if (fullManuscript.includes(search_text)) {
          console.log('Found match in Manuscript');
          const nextFull = fullManuscript.replace(search_text, replace_text)
          projectStore.bundle!.manuscript.content = nextFull.split('\n')
          result = '已成功更新正文文本段落'
          isSuccess = true
        } else {
          console.error('CRITICAL: search_text not found in either Outline or Manuscript');
          throw new Error('无法在当前正文或大纲中定位到指定的文本锚点，请尝试提供更精准的搜索片段。')
        }
      }
    } else if (call.function.name === 'upsert_entities') {
      const { type, entities } = args
      console.log(`Upserting ${type} entities:`, entities);

      if (type === 'character') {
        const updatedNames: string[] = []
        entities.forEach((entity: any) => {
          if (entity.id) {
            console.log(`Updating existing character: ${entity.id}`);
            const char = projectStore.bundle?.characters.find(c => c.id === entity.id)
            if (char) {
              const { id, type: _, ...updates } = entity
              Object.assign(char.base, updates)
              updatedNames.push(char.base.name)
              console.log('Successfully updated:', char.base.name);
            } else {
              console.error(`Character with ID ${entity.id} not found!`);
            }
          } else {
            console.log('Creating new character:', entity.name);
            const newChar = characterStore.addCharacter(entity.name || '新角色')
            if (newChar) {
              const { name: _, ...updates } = entity
              Object.assign(newChar.base, updates)
              updatedNames.push(newChar.base.name)
              console.log('Successfully created:', newChar.base.name);
            }
          }
        })
        result = `已同步 ${updatedNames.length} 个角色：${updatedNames.join(', ')}`
        isSuccess = true
      } else {
        console.warn(`Upsert for entity type "${type}" is not fully implemented.`);
        result = '目前仅支持角色实体的自动同步，其他类型即将上线。'
        isSuccess = true
      }
    } else if (call.function.name === 'delete_entities') {
      const { type, ids } = args
      console.log(`Deleting ${type} ids:`, ids);
      if (type === 'character') {
        ids.forEach((id: string) => {
          console.log(`Deleting character: ${id}`);
          characterStore.removeCharacter(id);
        })
        result = `成功删除了 ${ids.length} 个角色`
        isSuccess = true
      }
    }

    if (isSuccess) {
      console.log('Tool execution successful:', result);
      aiStore.executedToolCallIds.add(call.id)
      uiStore.showToast(result, 'success')
      projectStore.markDirty()

      // 将结果反馈给 AI 历史
      aiStore.addHistory('tool', result, 'text', {
        toolResults: [{
          toolCallId: call.id,
          content: JSON.stringify({ status: 'success', message: result })
        }]
      })
    }

  } catch (error: any) {
    console.error('Tool application failed:', error);
    uiStore.showToast(`执行失败: ${error.message}`, 'error')
  } finally {
    console.groupEnd();
  }
}

async function send() {
  if (!input.value.trim() || aiStore.isProcessing) return

  const capturedRefs: Record<string, any> = {}
  let contextPayload = "### [AI 参考内容与数据结构详解] ###\n\n"

  if (aiStore.referenceKeys.length > 0 && projectStore.bundle) {
    aiStore.referenceKeys.forEach(value => {
      const node = findNodeByValue(value)
      if (!node || !projectStore.bundle) return

      // 1. 数据定位
      const path = node.path || ''
      const keys = path.split('.')
      let rawData: any = projectStore.bundle
      keys.forEach(k => { if (rawData && k) rawData = rawData[k] })

      const selections = granularSelections.value[value] || []
      
      // 用户要求：如果开启了精细化筛选但没选任何子项，则不传给 AI 任何参数
      if (node.isGranular && selections.length === 0) return;

      let processedData: any;

      // 2. 路由到专用处理器或通用处理器
      const handlers = ContextEngine.handlers as Record<string, Function>;
      if (handlers[value]) {
        processedData = handlers[value](projectStore.bundle, selections)
      } else {
        processedData = ContextEngine.handlers.generic(rawData, selections)
      }

      // 3. 递归清理技术噪音并生成文档化说明
      const finalValue = ContextEngine.cleanData(processedData)
      capturedRefs[value] = finalValue

      contextPayload += ContextEngine.generateExplanation(node, !!(node.isGranular && selections.length > 0)) + '\n';
      contextPayload += `* 参考数据快照 (JSON):\n\`\`\`json\n${JSON.stringify(finalValue, null, 2)}\n\`\`\`\n\n`
    })
  }

  // 2. 构建 Prompt 内容 (全量发送给 AI)
  let finalContent = input.value
  const prompt = aiStore.allPrompts.find(p => p.id === selectedPromptId.value)
  if (prompt) {
    // 使用新的占位符 [JSON] 和 [USER_INPUT]
    finalContent = prompt.content
      .replace('[JSON]', contextPayload)
      .replace('[USER_INPUT]', input.value)
  } else if (aiStore.referenceKeys.length > 0) {
    finalContent = `${contextPayload}\n--- 任务指令 ---\n${input.value}`
  }

  // 3. 发送并保存参考快照
  // 注入 Payload 副本到 capturedRefs，以便弹窗显示“给 AI 看了什么”
  capturedRefs['__prompt_injection__'] = contextPayload

  await aiStore.sendMessage(input.value, finalContent, capturedRefs)
  input.value = ""
  
  await nextTick()
  if (historyBox.value) {
    historyBox.value.scrollTop = historyBox.value.scrollHeight
  }
}

watch(() => aiStore.isVisible, (val) => {
  if (val) {
    // 处理待定输入
    if (aiStore.pendingInput) {
      input.value = aiStore.pendingInput
      aiStore.pendingInput = '' // 消费后清除
    }
    
    // 展开所有被激活的精细化类目
    expandActiveKeys()
  }
})

function expandActiveKeys() {
  aiStore.referenceKeys.forEach(key => {
    const node = findNodeByValue(key)
    if (node?.isGranular && !expandedKeys.value.includes(key)) {
      expandedKeys.value.push(key)
    }
  })
}

watch(() => aiStore.history.length, async () => {
  await nextTick()
  if (historyBox.value) {
    historyBox.value.scrollTop = historyBox.value.scrollHeight
  }
})

function goToSettings(section?: string) {
  router.push({
    path: '/settings',
    query: { section: section || 'ai' }
  })
}
</script>

<style scoped>
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease-out, opacity 0.3s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>
