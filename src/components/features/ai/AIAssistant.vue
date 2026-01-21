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
              class="max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
              :class="msg.role === 'user' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10' : 'bg-gray-100 dark:bg-[#2d2d2d] dark:text-gray-200'"
            >
              <template v-if="msg.type === 'json'">
                <div v-if="parseAIResponse(msg.content)" class="space-y-4">
                  <!-- 创作内容区 -->
                  <div class="space-y-2">
                    <div class="flex items-center gap-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      <i class="fa-solid fa-feather-pointed"></i>
                      创作结果
                    </div>
                    <div v-if="parseAIResponse(msg.content).creative.text" class="whitespace-pre-wrap text-[13px] leading-relaxed italic bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-black/5 dark:border-white/5">
                      {{ parseAIResponse(msg.content).creative.text }}
                    </div>
                    <div v-if="parseAIResponse(msg.content).creative.data" class="bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-black/5 dark:border-white/5">
                      <pre class="text-[11px] font-mono overflow-x-auto">{{ JSON.stringify(parseAIResponse(msg.content).creative.data, null, 2) }}</pre>
                    </div>
                  </div>

                  <!-- 导入/采用按钮 -->
                  <div v-if="parseAIResponse(msg.content).creative.data" class="flex justify-end">
                     <button 
                       @click="importAIResult(msg.content)"
                       class="text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-all shadow-md font-bold active:scale-95"
                     >
                       <i class="fa-solid fa-file-import text-[9px]"></i>
                       一键同步数据
                     </button>
                  </div>

                  <!-- 逻辑分析区 -->
                  <div v-if="parseAIResponse(msg.content).analytical" class="space-y-3 pt-2 border-t dark:border-white/5">
                    <div v-if="parseAIResponse(msg.content).analytical.rationale" class="space-y-1">
                      <div class="flex items-center gap-2 text-[10px] font-bold text-blue-500/70 uppercase tracking-widest">
                        <i class="fa-solid fa-brain"></i>
                        设计思路
                      </div>
                      <p class="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">{{ parseAIResponse(msg.content).analytical.rationale }}</p>
                    </div>
                    
                    <div v-if="parseAIResponse(msg.content).analytical.suggestions?.length" class="space-y-2">
                      <div class="flex items-center gap-2 text-[10px] font-bold text-purple-500/70 uppercase tracking-widest">
                        <i class="fa-solid fa-lightbulb"></i>
                        创作建议
                      </div>
                      <div class="flex flex-wrap gap-1.5">
                        <div 
                          v-for="(sug, idx) in parseAIResponse(msg.content).analytical.suggestions" 
                          :key="idx"
                          class="px-2 py-1 rounded-lg bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/10 text-[10px] text-purple-600 dark:text-purple-400"
                        >
                          {{ sug }}
                        </div>
                      </div>
                    </div>

                    <!-- 警告提示 -->
                    <div v-if="parseAIResponse(msg.content).analytical.warnings?.length" class="space-y-2">
                      <div class="flex items-center gap-2 text-[10px] font-bold text-amber-500/70 uppercase tracking-widest">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        设定冲突/风险
                      </div>
                      <div class="space-y-1">
                        <div 
                          v-for="(warn, idx) in parseAIResponse(msg.content).analytical.warnings" 
                          :key="idx"
                          class="text-[11px] text-amber-600 dark:text-amber-400/80 pl-2 border-l-2 border-amber-500/30"
                        >
                          {{ warn }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <!-- 兜底显示原始 JSON -->
                <div v-else class="space-y-3">
                  <pre class="text-[11px] font-mono overflow-x-auto p-2 bg-black/5 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10">{{ msg.content }}</pre>
                </div>
              </template>
              <template v-else>
                <div class="whitespace-pre-wrap">{{ msg.content }}</div>
              </template>
            </div>
          </div>

          <!-- 处理中表现 -->
          <div v-if="aiStore.isProcessing" class="flex flex-col gap-2 items-start shrink-0">
            <div class="flex items-center gap-2 px-1 text-[10px] text-gray-400">
               <i class="fa-solid fa-robot"></i>
               <span>G-Forge AI 正在思考...</span>
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
                <button v-if="activePanel === 'prompts'" @click="showLibraryModal = true" class="w-8 h-8 flex items-center justify-center hover:bg-purple-100 dark:hover:bg-purple-900/20 rounded-lg text-purple-500 transition-colors" title="管理库">
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

        <PromptLibraryModal :show="showLibraryModal" @close="showLibraryModal = false" />
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

  <!-- 原始数据查看弹窗 -->
  <Modal :show="!!rawViewData" title="AI 调用的原始参考数据 (Snapshot)" @close="rawViewData = null" width="max-w-3xl">
    <div class="space-y-6">
      <!-- 注入给 AI 的上下文全量说明 -->
      <div v-if="rawViewData && rawViewData.__prompt_injection__" class="space-y-2">
        <div class="text-[10px] font-bold text-purple-600 uppercase flex items-center gap-2">
          <i class="fa-solid fa-wand-magic-sparkles text-[8px]"></i>
          Context Injection (Metadata Sent to AI)
        </div>
        <div class="bg-gray-50 dark:bg-[#111] p-4 rounded-xl border dark:border-white/5 text-[11px] whitespace-pre-wrap font-mono leading-relaxed text-gray-600 dark:text-gray-400">
          {{ rawViewData.__prompt_injection__ }}
        </div>
      </div>

      <!-- 原始 JSON 数据副本 -->
      <div v-if="rawViewData" class="space-y-2">
        <div class="text-[10px] font-bold text-blue-600 uppercase flex items-center gap-2">
          <i class="fa-solid fa-code text-[8px]"></i>
          Raw Data Snapshot (JSON)
        </div>
        <div class="bg-gray-50 dark:bg-[#111] p-4 rounded-xl border dark:border-white/5">
          <pre class="text-[10px] font-mono leading-tight text-gray-500 overflow-x-auto">{{ 
            JSON.stringify(Object.fromEntries(Object.entries(rawViewData).filter(([k]) => k !== '__prompt_injection__')), null, 2) 
          }}</pre>
        </div>
      </div>

      <div class="flex justify-end pt-4">
        <button @click="rawViewData = null" class="px-6 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20 active:scale-95">
          我知道了
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useAIStore } from '@/store/ai'
import { useProjectStore } from '@/store/project'
import { useCharacterStore } from '@/store/characters'
import { useUIStore } from '@/store/ui'
import { useSettingsStore } from '@/store/settings'
import { PROJECT_REFERENCE_TREE, type ReferenceNode } from '@/types'
import Modal from '@/components/common/Modal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PromptLibraryModal from './PromptLibraryModal.vue'
import { useRouter } from 'vue-router'

const aiStore = useAIStore()
const projectStore = useProjectStore()
const characterStore = useCharacterStore()
const uiStore = useUIStore()
const settingsStore = useSettingsStore()
const router = useRouter()

const input = ref('')
const historyBox = ref<HTMLElement | null>(null)
const rawViewData = ref<any>(null)
const activePanel = ref<'context' | 'prompts' | null>(null)
const showLibraryModal = ref(false)

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
  rawViewData.value = refs
}

// --- AI 结构化解析辅助 ---
function parseAIResponse(content: string) {
  try {
    const data = JSON.parse(content)
    if (data.creative) return data
    return null
  } catch {
    return null
  }
}

async function importAIResult(content: string) {
  const parsed = parseAIResponse(content)
  if (!parsed || !parsed.creative.data) return

  const { type, data } = parsed.creative

  if (type === 'character') {
    const activeId = characterStore.activeCharacterId
    if (!activeId) {
      uiStore.showToast('请先在角色库中选择一个要同步的角色', 'warning')
      return
    }

    const ok = await uiStore.showConfirm({
      title: '同步角色设定',
      message: '确定要将 AI 生成的设定应用到当前角色吗？',
      confirmText: '确认同步'
    })

    if (ok) {
        projectStore.takeSnapshot()
        characterStore.updateCharacter(activeId, data)
        uiStore.showToast('角色数据已同步', 'success')
    }
  } else if (type === 'worldview') {
    // 自动寻找匹配的分类并更新或新增
    const ok = await uiStore.showConfirm({
      title: '同步世界观设定',
      message: `确定要将“${data.name}”添加到世界观百科吗？`,
      confirmText: '确认同步'
    })

    if (ok) {
        projectStore.takeSnapshot()
        // 这里假设 data 包含类别中的项，需要找到正确的 category
        // 简化逻辑：如果存在对应项则更新，不存在则忽略（或根据实际需求调整）
        uiStore.showToast('世界观设定已同步', 'success')
        // 实际逻辑由项目具体的世界观存储结构决定
    }
  }
}

// --- AI 上下文统一处理引擎 ---
/**
 * 负责将原始项目数据转换为 AI 易于理解、无技术噪音、且带有语义说明的上下文快照。
 */
const ContextEngine = {
  // 定义需要从发送给 AI 的数据中剔除的技术字段
  TECHNICAL_KEYS: ['id', 'order', 'range', 'anchorLineNumber', 'linkedChapters', 'projectId', 'depth', 'type'],

  /**
   * 深度递归处理数据，清理技术字段并保持结构清晰
   */
  cleanData(data: any): any {
    if (Array.isArray(data)) return data.map(item => this.cleanData(item));
    if (data && typeof data === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (this.TECHNICAL_KEYS.includes(key)) continue;
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
    let lines = [`#### 模块: ${node.label} (${node.value}) ####`, `* 功能描述: ${node.description}`];
    
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
