<template>
  <div v-if="aiStore.isVisible" 
    ref="containerRef"
    class="h-full bg-white dark:bg-[#1e1e1e] border-l dark:border-[#333] flex flex-col overflow-hidden shrink-0 z-10 relative"
    :style="{ width: `${uiStore.rightPanelWidth}px` }"
  >
    <!-- Resize Handle -->
    <div 
      class="absolute top-0 bottom-0 left-0 w-1 cursor-col-resize z-50 hover:bg-purple-500/30 transition-colors"
      @mousedown="startResize"
    ></div>

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
        <IconButton
          icon="fa-solid fa-bug"
          :active="isDebugMockMode"
          :title="isDebugMockMode ? '关闭 UI 调试预览' : '打开 UI 调试预览'"
          @click="toggleDebugMockMode"
        />
        <IconButton
          v-if="isDebugMockMode"
          icon="fa-solid fa-rotate-right"
          title="重置 mock 对话"
          @click="resetDebugMockPreview"
        />
        <IconButton
          icon="fa-solid fa-gear"
          icon-class="group-hover:rotate-45 transition-transform"
          title="AI 模型管理"
          @click="uiStore.openModal('ai-profile')"
          class="group"
        />
        <IconButton
          icon="fa-solid fa-xmark"
          @click="aiStore.toggle()"
        />
      </div>
    </header>

    <!-- 中间内容区容器 -->
    <div class="flex-1 relative overflow-hidden">
      <!-- 聊天记录滚动区 -->
      <div class="absolute inset-0 overflow-y-auto p-4 space-y-2 flex flex-col pb-8" ref="historyBox">
        <div v-if="isDebugMockMode" class="shrink-0 flex items-center justify-between gap-3 px-3 py-2 rounded-2xl border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/80 dark:bg-amber-900/10 text-amber-700 dark:text-amber-300 shadow-sm">
          <div class="flex items-center gap-2 min-w-0">
            <i class="fa-solid fa-bug text-[10px] shrink-0"></i>
            <span class="text-[11px] font-bold truncate">UI 调试预览已开启，当前内容均为 mock 数据，不会写入项目。</span>
          </div>
          <button
            @click="resetDebugMockPreview"
            class="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/70 dark:bg-black/20 border border-amber-200/70 dark:border-amber-700/40 hover:bg-white dark:hover:bg-black/30 transition-colors"
          >
            重置
          </button>
        </div>

        <EmptyState
          v-if="displayHistory.length === 0"
          icon="fa-comment-dots"
          size="xl"
          :circle="false"
          subtitle="选择要提供给AI参考内容，并开始对话"
        />

        <div v-for="msg in displayHistory" :key="msg.id">
          <div 
            v-if="msg.role !== 'tool' && (msg.content?.trim() || (msg.toolCalls && msg.toolCalls.length > 0))" 
            class="flex flex-col gap-2 shrink-0 group/msg" 
            :class="msg.role === 'user' ? 'items-end' : 'items-start'"
          >
            <div class="flex items-center gap-2 px-1 text-[10px] text-gray-400 w-full" :class="msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'">
              <!-- 发送人标识 -->
              <div class="flex items-center gap-2 shrink-0">
                <i :class="msg.role === 'user' ? 'fa-solid fa-user' : 'fa-solid fa-robot'"></i>
                <span>{{ msg.role === 'user' ? '你' : 'G-Forge AI' }}</span>
              </div>

              <!-- 复制按钮：显示在发送人标记的另一侧 -->
              <IconButton
                v-if="msg.content"
                icon="fa-regular fa-copy"
                size="xs"
                title="复制原始 MD 内容"
                class="opacity-0 group-hover/msg:opacity-100 transition-opacity hover:!text-purple-600"
                @click="copyContent(msg.content)"
              />
          </div>
          
          <div 
            class="max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative group/msg cursor-text select-text overflow-hidden"
            :class="[
              msg.role === 'user' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10' : 'bg-gray-100 dark:bg-[#2d2d2d] dark:text-gray-200',
              msg.isError ? '!bg-red-50 dark:!bg-red-900/10 border border-red-200 dark:border-red-900/50 !text-red-600 dark:!text-red-400' : ''
            ]"
          >
            <!-- 文本内容区 -->
            <div v-if="msg.isError" class="flex flex-col gap-3">
                <div class="flex items-start gap-2">
                  <i class="fa-solid fa-triangle-exclamation mt-1 shrink-0"></i>
                  <div class="markdown-content" v-html="renderMarkdown(msg.content)"></div>
                </div>
                <button 
                  v-if="msg.retryParams && !aiStore.isProcessing"
                  @click="aiStore.retryMessage(msg.id)"
                  class="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-red-600 text-white text-[11px] font-bold hover:bg-red-700 transition-all active:scale-95 shadow-md shadow-red-500/20"
                >
                  <i class="fa-solid fa-rotate-right text-[10px]"></i>
                  立即重试任务
                </button>
            </div>
            <div v-else class="markdown-content" v-html="renderMarkdown(msg.content)"></div>

            <!-- 工具调用项（按顺序直接显示，不折叠） -->
            <div v-if="msg.toolCalls && msg.toolCalls.length > 0" class="mt-3 space-y-0">
              <div v-for="(call, callIndex) in msg.toolCalls" :key="call.id" 
                class="group/tool relative transition-all duration-200 flex gap-0"
              >
                <!-- 左侧竖条：连接所有工具调用，贯穿整个高度 -->
                <div class="w-0.5 shrink-0 bg-gradient-to-b"
                  :class="[
                    callIndex === 0 && msg.toolCalls.length > 1 
                      ? 'from-transparent via-gray-300 to-gray-300 dark:via-gray-600 dark:to-gray-600' 
                      : callIndex === msg.toolCalls.length - 1 
                      ? 'from-gray-300 via-gray-300 to-transparent dark:from-gray-600 dark:via-gray-600 dark:to-transparent'
                      : 'from-gray-300 to-gray-300 dark:from-gray-600 dark:to-gray-600'
                  ]"
                ></div>

                <!-- 工具内容区：包含摘要和展开面板 -->
                <div class="flex-1 flex flex-col">
                  <!-- 工具调用项：可展开详情 -->
                  <div 
                    class="flex items-center gap-2 cursor-pointer select-none p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    @click="expandedToolCallIds.has(call.id) ? expandedToolCallIds.delete(call.id) : expandedToolCallIds.add(call.id)"
                  >
                    <!-- 状态指示点 -->
                    <div class="shrink-0 w-1.5 h-1.5 rounded-full"
                    :class="[
                      readOnlyTools.includes(call.function.name) || (isToolExecuted(call.id) && !isToolRejected(call.id) && !isToolFailed(call.id)) ? 'bg-green-500' : '',
                      isToolRejected(call.id) ? 'bg-gray-400' : '',
                      isToolFailed(call.id) ? 'bg-red-500' : '',
                      !isToolExecuted(call.id) && !readOnlyTools.includes(call.function.name) ? 'bg-blue-500' : ''
                    ]"
                  />

                    <!-- 工具调用摘要 -->
                    <div class="flex-1 min-w-0">
                      <div class="text-[11px] leading-relaxed text-gray-700 dark:text-gray-300 font-medium">
                        {{ getToolSummary(call) }}
                      </div>
                    </div>

                    <!-- 展开指示 -->
                    <i class="fa-solid fa-chevron-down text-[8px] text-gray-400 shrink-0" :class="expandedToolCallIds.has(call.id) ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                  </div>

                  <!-- 工具详情展开区（需要批阅时在此显示按钮） -->
                  <div v-if="expandedToolCallIds.has(call.id)" class="mt-2 mx-2 p-2 rounded border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/20 space-y-2 animate-in fade-in duration-200">
                    <!-- 技术详情 -->
                    <div class="space-y-1">
                    <div class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">API: <span class="font-mono text-blue-600 dark:text-blue-400">{{ call.function.name }}</span></div>
                    <pre class="p-1.5 bg-white dark:bg-black/40 rounded border dark:border-white/5 text-[9px] text-gray-500 overflow-x-auto whitespace-pre-wrap leading-tight max-h-[120px]">{{ formatArgs(call.function.arguments) }}</pre>
                  </div>

                  <!-- 执行结果 -->
                  <div v-if="getToolResultForCall(call.id)" class="space-y-1">
                    <div class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">结果</div>
                    <div 
                      class="p-1.5 rounded text-[9px] font-mono leading-tight max-h-[80px] overflow-y-auto"
                      :class="isToolRejected(call.id) ? 'bg-gray-100 dark:bg-gray-900/30 text-gray-500' : 'bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400'"
                    >
                      {{ isToolRejected(call.id) ? '已拒绝' : getToolResultForCall(call.id)?.content }}
                    </div>
                  </div>

                  <!-- 操作按钮（需要批阅时显示） -->
                  <div v-if="!isToolExecuted(call.id) && !readOnlyTools.includes(call.function.name) && !isAssistantBusy" class="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-white/5">
                    <button 
                      @click.stop="handleApplyTool(msg.id, call)"
                      class="text-[9px] bg-[#007acc] hover:bg-[#0062a3] text-white px-2 py-1 rounded transition-all font-bold flex items-center gap-1 active:scale-95"
                    >
                      <i class="fa-solid fa-bolt-lightning text-[8px]"></i>
                      执行
                    </button>
                    <button 
                      @click.stop="handleRejectTool(msg.id, call)"
                      class="text-[9px] bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-600 dark:text-gray-400 px-2 py-1 rounded transition-all font-bold flex items-center gap-1 active:scale-95"
                    >
                      <i class="fa-solid fa-ban text-[8px]"></i>
                      拒绝
                    </button>
                  </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 上下文引用 Chips：移动至泡泡右下角 -->
            <div v-if="msg.selectedReferences && msg.selectedReferences.length > 0" class="mt-2 flex flex-wrap justify-end gap-1 border-t border-black/5 dark:border-white/5 pt-2">
              <div v-for="(ref, ridx) in msg.selectedReferences" :key="ridx" 
                class="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border transition-colors shadow-sm"
                :class="msg.role === 'user' 
                  ? 'bg-white/20 border-white/20 text-white' 
                  : 'bg-purple-50 dark:bg-purple-900/40 border-purple-100 dark:border-purple-800 text-purple-600 dark:text-purple-400'"
              >
                <i class="fa-solid fa-at text-[7px] opacity-70"></i>
                <span>{{ ref.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 处理中表现：仅在没有正在生成的回复内容时显示 -->
        <div v-if="showProcessingIndicator" class="flex flex-col gap-2 items-start shrink-0">
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
          
          <div class="flex-1 overflow-y-auto p-5 space-y-8">
            <!-- 参考内容配置面板 -->
            <div v-if="activePanel === 'context'" class="space-y-8">
              <!-- 基础信息组 -->
              <div class="space-y-3">
                <div class="text-ui-header px-1">基础 & 备忘</div>
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
                <div class="text-ui-header px-1">正文 & 结构</div>
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
                        <div class="text-ui-header flex items-center gap-2">
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
                <div class="text-ui-header px-1">世界 & 角色</div>
                <div class="space-y-4">
                  <div v-for="val in ['worldview', 'timeline', 'character']" :key="val" class="space-y-2">
                    <button 
                      @click="toggleContext(val)"
                      class="w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all hover:shadow-md group"
                      :class="aiStore.referenceKeys.includes(val) 
                        ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800 ring-2 ring-orange-100/50 dark:ring-orange-900/30' 
                        : 'bg-white dark:bg-[#252525] border-gray-100 dark:border-white/5 shadow-sm'"
                    >
                      <div class="flex items-center gap-3 truncate">
                        <i class="text-xs" :class="[
                          val === 'worldview' ? 'fa-solid fa-earth-asia' : val === 'timeline' ? 'fa-solid fa-clock-rotate-left' : 'fa-solid fa-users',
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
                        <div class="text-ui-header flex items-center gap-2">
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


    <!-- 输入区 (4行设计) -->
    <footer class="p-4 border-t dark:border-[#333] bg-gray-50/50 dark:bg-[#252525]/50 backdrop-blur-md shrink-0 space-y-2">
      <!-- 第一行：任务与上下文控制区 -->
      <div class="flex items-center gap-2">
        <!-- 提示词选择 -->
        <div class="relative flex-1 group">
          <button 
            @click="activePanel = activePanel === 'prompts' ? null : 'prompts'"
            class="w-full h-9 flex items-center justify-between gap-2 px-3 rounded-xl border text-[11px] font-bold transition-all bg-white dark:bg-[#1e1e1e] border-gray-100 dark:border-white/5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            :class="{ 'border-purple-500/50 text-purple-600': selectedPromptId }"
          >
            <div class="flex items-center gap-2 truncate">
              <i class="fa-solid fa-wand-sparkles text-[9px]"></i>
              <span class="truncate">{{ selectedPromptId ? (aiStore.allPrompts.find(p => p.id === selectedPromptId)?.label) : '选择任务模板' }}</span>
            </div>
            <i class="fa-solid fa-chevron-down text-[8px] opacity-50"></i>
          </button>
          <button v-if="selectedPromptId" @click.stop="selectedPromptId = ''" class="absolute -top-1 -right-1 w-4 h-4 bg-gray-100 dark:bg-[#333] rounded-full flex items-center justify-center text-[8px] hover:text-red-500 transition-colors">
              <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- 实体选择开关 (手动面板) -->
        <button 
          @click="activePanel = activePanel === 'context' ? null : 'context'"
          class="w-9 h-9 flex items-center justify-center rounded-xl border text-[11px] transition-all"
          :class="activePanel === 'context' 
            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' 
            : 'bg-white dark:bg-[#1e1e1e] border-gray-100 dark:border-white/5 text-gray-400'"
          title="手动选择参考上下文"
        >
          <i class="fa-solid fa-database text-[10px]"></i>
        </button>

        <!-- 添加当前到参考 -->
        <button 
          @click="addCurrentEntityToReference"
          :disabled="!canReferenceCurrent"
          class="w-9 h-9 flex items-center justify-center rounded-xl border transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          :class="canReferenceCurrent 
            ? 'border-indigo-100 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:scale-105 shadow-sm shadow-indigo-500/10' 
            : 'border-gray-100 dark:border-white/5 bg-white dark:bg-[#1e1e1e] text-gray-400'"
          title="添加当前页面实体到参考"
        >
          <i class="fa-solid fa-link text-[10px]"></i>
        </button>
      </div>

      <!-- 第二行：参考实体展示行 -->
      <div v-if="activeReferences.length > 0" class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-h-[28px]">
        <div 
          v-for="(ref, idx) in activeReferences" 
          :key="idx"
          class="flex items-center gap-1.5 px-2.5 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 text-[10px] text-indigo-600 dark:text-indigo-400 group shrink-0"
        >
          <i class="fa-solid" :class="[
            ref.type === 'character' ? 'fa-user' : 
            ref.type === 'manuscript' ? 'fa-file-lines' : 
            ref.type === 'outline' ? 'fa-scroll' :
            ref.type === 'worldview' ? 'fa-earth-asia' : 
            ref.type === 'timeline' ? 'fa-clock-rotate-left' : 
            ref.type === 'chapters' ? 'fa-list-ul' : 'fa-tag'
          ]"></i>
          <span class="font-bold">@{{ ref.label }}</span>
          <button @click="removeReference(ref)" class="hover:text-red-500 transition-colors ml-0.5">
            <i class="fa-solid fa-circle-xmark opacity-60"></i>
          </button>
        </div>
      </div>

      <!-- 第三行：输入区 -->
      <div class="relative group">
        <Input 
          ref="inputAreaRef"
          v-model="input"
          :disabled="isDebugMockMode"
          type="textarea"
          :rows="4"
          color="purple"
          input-class="!rounded-2xl pl-4 pr-12 py-3 text-[13px] leading-relaxed shadow-sm"
          :placeholder="isDebugMockMode ? 'UI 调试预览已开启，当前输入不会发送' : '输入任务描述，支持 @ 引用实体...'"
          @input="handleAtInput"
          @blur="handleAtBlur"
          @keydown="handleAtKeydown"
          @keydown.enter.ctrl.exact="send"
        />
      </div>

      <!-- 第四行：执行控制区 -->
      <div class="flex items-center justify-between gap-2 h-9">
        <div class="flex items-center gap-2 h-full">
          <!-- 模式选择 -->
          <select 
            v-model="executionMode"
            class="h-full bg-white dark:bg-[#1e1e1e] border border-gray-100 dark:border-white/10 rounded-xl px-2.5 text-[11px] font-bold outline-none transition-all cursor-pointer"
            :class="executionMode === 'agent' ? 'text-orange-500 border-orange-500/30' : 'text-blue-500 border-blue-500/30'"
          >
            <option value="chat">Chat</option>
            <option value="agent">Agent</option>
          </select>

          <!-- 模型选择 (从 settingsStore 获取) -->
          <div class="h-full flex items-center px-3 text-[11px] text-gray-400 font-mono bg-white/50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 truncate max-w-[140px]">
            <i class="fa-solid fa-microchip text-[9px] mr-2 opacity-50"></i>
            {{ settingsStore.activeAIProfile?.model || '未选模型' }}
          </div>
        </div>

        <div class="flex items-center gap-3 h-full">
          <span class="text-[9px] text-gray-400 font-medium">Ctrl+Enter</span>
          <button 
            @click="send"
            :disabled="!input.trim() || aiStore.isProcessing || isDebugMockMode"
            class="h-full flex items-center px-4 bg-purple-600 text-white rounded-xl text-[11px] font-bold hover:bg-purple-700 disabled:opacity-30 transition-all shadow-md shadow-purple-500/20 active:scale-95"
          >
            <i v-if="!aiStore.isProcessing" class="fa-solid fa-paper-plane text-[9px]"></i>
            <i v-else class="fa-solid fa-circle-notch fa-spin text-[9px]"></i>
          </button>
        </div>
      </div>
    </footer>

    <!-- @Mention 菜单 (浮层) -->
    <div v-if="atMenu.visible" class="absolute inset-0 z-[95]" @click="closeAtMenu"></div>
    <div 
      v-if="atMenu.visible"
      @mousedown.prevent
      class="absolute bottom-[200px] left-4 z-[100] bg-white dark:bg-[#222] border dark:border-[#333] rounded-xl shadow-2xl w-56 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      <div v-if="atMenu.step === 1" class="py-1">
        <div class="px-3 py-2 text-ui-header border-b border-divider mb-1 flex items-center gap-2">
          <i class="fa-solid fa-at text-purple-500"></i>
          引用实体类型
        </div>
        <div ref="atScrollContainer1" class="max-h-[300px] overflow-y-auto custom-scrollbar">
          <button 
            v-for="(type, idx) in atMenu.types" 
            :key="type.value"
            @click="selectAtType(type)"
            class="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] transition-colors"
            :class="atMenu.selectedIndex === idx ? 'bg-purple-600 text-white active-at-item' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'"
          >
            <i class="fa-solid w-4 text-center" :class="type.icon"></i>
            {{ type.label }}
            <i class="fa-solid fa-chevron-right ml-auto text-[9px] opacity-30"></i>
          </button>
        </div>
      </div>
      <div v-else class="py-1 flex flex-col max-h-[320px]">
        <div class="px-3 py-2 flex items-center justify-between border-b border-divider mb-1 bg-app-side">
          <span class="text-ui-header flex items-center gap-2">
             <button @click="atMenu.step = 1" class="hover:text-purple-700"><i class="fa-solid fa-arrow-left"></i></button>
             选择{{ atMenu.types.find(t => t.value === atMenu.selectedType)?.label }}
          </span>
          <span v-if="atMenu.search" class="text-[9px] bg-purple-100 dark:bg-purple-900/40 px-1.5 py-0.5 rounded text-purple-600">{{ atMenu.search }}</span>
        </div>
        <div ref="atScrollContainer2" class="flex-1 overflow-y-auto custom-scrollbar pr-0.5">
          <button 
            v-for="(item, idx) in filteredAtInstances" 
            :key="item.id"
            @click="confirmAtReference(item)"
            class="w-full text-left px-3 py-2.5 text-[13px] transition-colors truncate border-b border-gray-50 dark:border-white/5 last:border-0"
            :class="atMenu.selectedIndex === idx ? 'bg-purple-600 text-white active-at-item' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'"
          >
            <i class="fa-solid fa-check-circle mr-2 text-[10px]" :class="atMenu.selectedIndex === idx ? 'opacity-100' : 'opacity-0'"></i>
            {{ item.label }}
          </button>
          <div v-if="filteredAtInstances.length === 0" class="px-3 py-8 text-center">
            <i class="fa-solid fa-magnifying-glass text-gray-300 mb-2 block"></i>
            <span class="text-xs text-gray-400">未找到相关项</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, reactive, onUnmounted } from 'vue'
import { marked } from 'marked'
import { useAIStore } from '@/store/ai'
import { useProjectStore } from '@/store/project'
import { useCharacterStore } from '@/store/characters'
import { useOutlineStore } from '@/store/outline'
import { useWorldviewStore } from '@/store/worldview'
import { useUIStore } from '@/store/ui'
import { useSettingsStore } from '@/store/settings'
import { PROJECT_REFERENCE_TREE, type ReferenceNode, type AIToolCall, type AIReference, type AIHistoryItem, type AIToolResult } from '@/types'
import { AI_TOOLS, READ_ONLY_TOOLS, getTool } from '@/core/ai/tools'
import EmptyState from '@/components/common/EmptyState.vue'
import Input from '@/components/common/Input.vue'
import IconButton from '@/components/common/IconButton.vue'
import { useRouter } from 'vue-router'

const aiStore = useAIStore()
const projectStore = useProjectStore()
const characterStore = useCharacterStore()
const outlineStore = useOutlineStore()
const worldviewStore = useWorldviewStore()
const uiStore = useUIStore()
const settingsStore = useSettingsStore()
const router = useRouter()

const containerRef = ref<HTMLElement | null>(null)
const input = ref('')
const expandedToolCallIds = reactive(new Set<string>())
const historyBox = ref<HTMLElement | null>(null)
const inputAreaRef = ref<any>(null)
const activePanel = ref<'context' | 'prompts' | null>(null)

const DEBUG_ENTITY_NAME_MAP: Record<string, Record<string, string>> = {
  character: {
    'char-01': '乔伊斯',
    'char-02': '维罗妮卡',
    'char-03': '执灯人'
  },
  chapters: {
    'ch-01': '第一章：圣光塔',
    'ch-02': '第二章：回声长廊'
  },
  worldview: {
    'world-01': '圣光信仰',
    'world-02': '塔城秩序'
  }
}

const DEBUG_EXECUTED_TOOL_CALL_IDS = [
  'search-1',
  'list-1',
  'detail-1',
  'upsert-1',
  'schema-1'
]

const DEBUG_EXPANDED_TOOL_CALL_IDS = [
  'search-1',
  'list-1',
  'detail-1',
  'upsert-1',
  'schema-1',
  'edit-1'
]

const isDebugMockMode = ref(false)
const debugMockHistory = ref<AIHistoryItem[]>([])
const debugExecutedToolCallIds = reactive(new Set<string>())

function createDebugToolCall(id: string, name: string, args: Record<string, any>): AIToolCall {
  return {
    id,
    type: 'function',
    function: {
      name,
      arguments: JSON.stringify(args)
    }
  }
}

function createDebugToolResult(toolCallId: string, payload: Record<string, any>): AIToolResult {
  return {
    toolCallId,
    content: JSON.stringify(payload, null, 2)
  }
}

function createDebugMockHistory(): AIHistoryItem[] {
  const now = Date.now()

  return [
    {
      id: 'debug-user-1',
      role: 'user',
      content: '请帮我梳理“圣光塔”相关设定，并看看乔伊斯能否作为第一章核心视角。',
      type: 'text',
      selectedReferences: [
        { type: 'character', id: 'char-01', label: '角色: 乔伊斯' },
        { type: 'chapters', id: 'ch-01', label: '章节: 第一章：圣光塔' }
      ],
      timestamp: now
    },
    {
      id: 'debug-assistant-1',
      role: 'assistant',
      content: `## 综合分析

首先搜索了正文中的"圣光"关键词，共发现102个相关段落。

**获取角色列表完成。** 现在查看乔伊斯的详细信息，然后进行相应的更新。

**分析完成。** 建议更新乔伊斯的角色定义，强化她的核心身份。

让我先查询数据字段**定义，然后尝试编辑正文内容。`,
      type: 'text',
      toolCalls: [
        createDebugToolCall('search-1', 'searchEntities', { type: 'manuscript', query: '圣光' }),
        createDebugToolCall('list-1', 'getEntityList', { type: 'character' }),
        createDebugToolCall('detail-1', 'getEntityDetail', { type: 'character', ids: ['char-01'] }),
        createDebugToolCall('upsert-1', 'upsertEntities', { entities: [{ type: 'character', id: 'char-01', name: '乔伊斯' }] }),
        createDebugToolCall('schema-1', 'getEntitySchema', { type: 'character' }),
        createDebugToolCall('edit-1', 'editTextBlock', { search_text: '乔伊斯踏入', replacement_text: '乔伊斯小心翼翼踏入' })
      ],
      timestamp: now + 1
    },
    {
      id: 'debug-tool-1',
      role: 'tool',
      content: '',
      type: 'text',
      toolResults: [
        createDebugToolResult('search-1', {
          status: 'success',
          data: {
            type: 'manuscript',
            query: '圣光',
            count: 102,
            results: [
              { text: '圣光塔顶升起苍白的火焰', location: 'ch-01:p5' },
              { text: '圣光沿着穹顶裂缝倾泻而下', location: 'ch-01:p12' }
            ],
            hasMore: true
          },
          message: '检索到 102 个匹配项。'
        }),
        createDebugToolResult('list-1', {
          status: 'success',
          data: {
            type: 'character',
            entities: [
              { id: 'char-01', type: 'character', name: '乔伊斯' },
              { id: 'char-02', type: 'character', name: '维罗妮卡' },
              { id: 'char-03', type: 'character', name: '执灯人' }
            ]
          },
          message: '已获取 3 个角色'
        }),
        createDebugToolResult('detail-1', {
          status: 'success',
          data: {
            type: 'character',
            entities: [{ id: 'char-01', type: 'character', name: '乔伊斯', tags: ['圣光', '调查员'] }]
          },
          message: '成功拉取 1 个实体的详情'
        }),
        createDebugToolResult('upsert-1', {
          status: 'success',
          data: {
            created: [],
            updated: [{ id: 'char-01', type: 'character' }]
          },
          message: '已成功更新 1 个角色'
        }),
        createDebugToolResult('schema-1', {
          status: 'success',
          data: {
            type: 'character',
            fields: ['name', 'age', 'background', 'tags']
          },
          message: '已获取字段定义'
        }),
        createDebugToolResult('edit-1', {
          status: 'error',
          data: { error: 'Text not found' },
          message: '未找到匹配文本'
        })
      ],
      timestamp: now + 2
    }
  ]
}

function scrollHistoryToBottom() {
  if (historyBox.value) {
    historyBox.value.scrollTop = historyBox.value.scrollHeight
  }
}

function resetDebugMockPreview() {
  debugMockHistory.value = createDebugMockHistory()
  debugExecutedToolCallIds.clear()
  DEBUG_EXECUTED_TOOL_CALL_IDS.forEach(id => debugExecutedToolCallIds.add(id))
  expandedToolCallIds.clear()
  DEBUG_EXPANDED_TOOL_CALL_IDS.forEach(id => expandedToolCallIds.add(id))
  nextTick(() => {
    scrollHistoryToBottom()
  })
}

async function toggleDebugMockMode() {
  isDebugMockMode.value = !isDebugMockMode.value
  activePanel.value = null
  closeAtMenu()

  if (isDebugMockMode.value) {
    input.value = ''
    selectedPromptId.value = ''
    resetDebugMockPreview()
    await nextTick()
    scrollHistoryToBottom()
    uiStore.showToast('已开启 UI 调试预览', 'success')
    return
  }

  expandedToolCallIds.clear()
  await nextTick()
  scrollHistoryToBottom()
  uiStore.showToast('已退出 UI 调试预览', 'info')
}

const displayHistory = computed(() => isDebugMockMode.value ? debugMockHistory.value : aiStore.history)
const isAssistantBusy = computed(() => !isDebugMockMode.value && aiStore.isProcessing)
const showProcessingIndicator = computed(() => {
  if (!isAssistantBusy.value) return false
  const lastMsg = aiStore.history[aiStore.history.length - 1]
  return !aiStore.history.length || (lastMsg.role !== 'assistant' || (!lastMsg.content?.trim() && !lastMsg.toolCalls?.length))
})

function isToolExecuted(callId: string) {
  return isDebugMockMode.value
    ? debugExecutedToolCallIds.has(callId)
    : aiStore.executedToolCallIds.has(callId)
}

// --- 工具解析辅助 ---
const readOnlyTools = READ_ONLY_TOOLS;

/**
 * 自动管理工具调用展开状态
 * 发现新的待确认工具调用时，自动展开该调用项（但不展开折叠列表，因为已删除）
 */
watch(() => aiStore.history, (newHistory) => {
  const lastMsg = newHistory[newHistory.length - 1]
  if (lastMsg && lastMsg.role === 'assistant' && lastMsg.toolCalls) {
    lastMsg.toolCalls.forEach(call => {
      // 如果是写入型工具，且未执行过，则自动展开该调用项
      if (!readOnlyTools.includes(call.function.name) && 
          !aiStore.executedToolCallIds.has(call.id)) {
        expandedToolCallIds.add(call.id)
      }
    })
  }
}, { deep: true })

// --- @Mention 状态与滚动控制 ---
const atScrollContainer1 = ref<HTMLElement | null>(null)
const atScrollContainer2 = ref<HTMLElement | null>(null)

const atMenu = reactive({
  visible: false,
  step: 1 as 1 | 2,
  search: '',
  selectedType: null as string | null,
  selectedIndex: 0,
  rect: { top: 0, left: 0 },
  types: [
    { value: 'character', label: '角色', icon: 'fa-user-circle' },
    { value: 'outline', label: '大纲', icon: 'fa-scroll' },
    { value: 'worldview', label: '世界观设定', icon: 'fa-earth-asia' },
    { value: 'chapters', label: '目录', icon: 'fa-list-ul' },
    { value: 'manuscript', label: '正文', icon: 'fa-file-lines' },
    { value: 'timeline', label: '时间线', icon: 'fa-clock-rotate-left' },
  ],
  instances: [] as any[]
})

/**
 * 自动滚动 @ 菜单以确保当前选中的 item 可见
 */
watch([() => atMenu.selectedIndex, () => atMenu.step], async () => {
  if (!atMenu.visible) return
  await nextTick()
  
  const container = atMenu.step === 1 ? atScrollContainer1.value : atScrollContainer2.value
  if (!container) return

  const activeItem = container.querySelector('.active-at-item') as HTMLElement
  if (activeItem) {
    activeItem.scrollIntoView({ block: 'nearest', behavior: 'auto' })
  }
})

const filteredAtInstances = computed(() => {
  const query = atMenu.search.toLowerCase()
  const list = [
    { id: 'all', label: '所有' },
    ...atMenu.instances
  ]
  if (!query) return list
  return list.filter(i => (i.label || '').toLowerCase().includes(query))
})

// --- 模式切换与模型 ---
const executionMode = computed({
  get: () => aiStore.executionMode,
  set: (val) => aiStore.executionMode = val
})

/**
 * 核心同步逻辑：将手动选择的状态转化为 @引用列表
 */
const activeReferences = computed(() => {
  const refs: AIReference[] = []
  
  aiStore.referenceKeys.forEach(key => {
    const node = findNodeByValue(key)
    if (!node) return
    
    // 获取分类标签 (例如 "角色")
    const typeLabel = atMenu.types.find(t => t.value === key)?.label || node.label

    if (!node.isGranular) {
      // 非精细化项 (如项目元数据)
      refs.push({ type: key as any, id: 'all', label: `${typeLabel}: 所有` })
    } else {
      // 精细化项 (如角色、章节)
      const selectedIds = aiStore.granularSelections[key] || []
      const options = aiStore.getContextOptions(key)
      
      if (selectedIds.length > 0 && selectedIds.length === options.length && !selectedIds.some(id => typeof id === 'object')) {
         refs.push({ type: key as any, id: 'all', label: `${typeLabel}: 所有` })
      } else {
        selectedIds.forEach(id => {
          if (typeof id === 'object' && (id as any).start !== undefined) {
             // 处理范围引用 (如正文选区)
             const obj = id as any
             refs.push({ 
               type: key as any, 
               id: `range:${obj.start}-${obj.end}`, 
               label: obj.label || `${typeLabel}: ${obj.start}-${obj.end}`,
               range: { start: obj.start, end: obj.end }
             })
          } else {
            const opt = options.find((o: any) => o.id === id)
            if (opt) {
              refs.push({ type: key as any, id: id as string, label: `${typeLabel}: ${opt.label}` })
            }
          }
        })
      }
    }
  })
  return refs
})

// 同步本地计算得到的引用列表到 store，以便 sendMessage 能抓取到正确的上下文快照
watch(activeReferences, (newRefs) => {
  aiStore.activeReferences = newRefs
}, { immediate: true })

function removeReference(ref: AIReference) {
  if (ref.id === 'all') {
    // 移除大类
    const idx = aiStore.referenceKeys.indexOf(ref.type)
    if (idx !== -1) aiStore.referenceKeys.splice(idx, 1)
    // 如果是精细化类，清空其子项
    if (aiStore.granularSelections[ref.type]) {
      aiStore.granularSelections[ref.type] = []
    }
  } else {
    // 移除特定子项
    const items = aiStore.granularSelections[ref.type] || []
    let idx = -1
    
    if (ref.id.startsWith('range:')) {
       // 查找范围对象
       idx = items.findIndex((i: any) => 
         typeof i === 'object' && `range:${i.start}-${i.end}` === ref.id
       )
    } else {
       idx = items.indexOf(ref.id)
    }

    if (idx !== -1) {
      items.splice(idx, 1)
    }
    // 同步更新大类激活状态
    syncCategorySelection(ref.type)
  }
}

function handleAtInput(e: Event) {
  const textarea = e.target as HTMLTextAreaElement
  const cursor = textarea.selectionStart
  const val = textarea.value
  const textBefore = val.substring(0, cursor)
  
  // 查找当前光标前最近的一个 @
  const lastAtIndex = textBefore.lastIndexOf('@')
  
  // 如果没有 @，则关闭菜单
  if (lastAtIndex === -1) {
    if (atMenu.visible) closeAtMenu()
    return
  }

  // 获取 @ 之后到当前光标的内容
  const query = textBefore.substring(lastAtIndex + 1)
  
  atMenu.visible = true

  // 检查 query 是否以某个已知类型开头
  const foundType = atMenu.types.find(t => query.startsWith(t.label))
  
  if (foundType) {
    // 进入二级菜单（筛选实例）
    atMenu.step = 2
    atMenu.selectedType = foundType.value
    atMenu.instances = aiStore.getContextOptions(foundType.value)
    // 搜索词是类型名之后的内容
    atMenu.search = query.substring(foundType.label.length).trimStart()
  } else {
    // 退回一级菜单（选择类型）
    atMenu.step = 1
    atMenu.search = query
    atMenu.selectedType = null
  }
  
  atMenu.selectedIndex = 0
}

async function selectAtType(type: any) {
  atMenu.selectedType = type.value
  atMenu.step = 2
  atMenu.selectedIndex = 0
  atMenu.search = ''
  atMenu.instances = aiStore.getContextOptions(type.value)

  // 在编辑区域追加类型名称
  const textarea = inputAreaRef.value?.el
  if (textarea) {
    const cursor = textarea.selectionStart
    const textBefore = textarea.value.substring(0, cursor)
    const lastAtIndex = textBefore.lastIndexOf('@')
    const textAfter = textarea.value.substring(cursor)
    
    // 更新输入框内容：@ -> @类型 (追加一个空格便于后续输入)
    const newTextBefore = textarea.value.substring(0, lastAtIndex + 1) + type.label + ' '
    input.value = newTextBefore + textAfter
    
    // 将光标移至空格之后
    nextTick(() => {
      const newCursor = newTextBefore.length
      textarea.setSelectionRange(newCursor, newCursor)
      textarea.focus()
    })
  }
}

function handleAtBlur() {
  // 延迟关闭，防止点击菜单项时菜单立即消失导致点击失效
  setTimeout(() => {
    closeAtMenu()
  }, 200)
}

function confirmAtReference(instance: any) {
  const type = atMenu.selectedType!
  
  if (instance.id === 'all') {
    if (!aiStore.referenceKeys.includes(type)) {
      aiStore.referenceKeys.push(type)
    }
    const options = aiStore.getContextOptions(type)
    aiStore.granularSelections[type] = options.map((o: any) => o.id)
  } else {
    if (!aiStore.granularSelections[type]) aiStore.granularSelections[type] = []
    
    // 如果是范围对象，执行深度比较
    const isRange = typeof instance.id === 'object' && instance.id.start !== undefined
    const exists = isRange 
      ? aiStore.granularSelections[type].some((id: any) => 
          typeof id === 'object' && id.start === instance.id.start && id.end === instance.id.end
        )
      : aiStore.granularSelections[type].includes(instance.id)

    if (!exists) {
      aiStore.granularSelections[type].push(instance.id)
    }
    syncCategorySelection(type)
  }
  
  const textarea = inputAreaRef.value?.el
  if (textarea) {
    const cursor = textarea.selectionStart
    const textBefore = textarea.value.substring(0, cursor)
    const lastAtIndex = textBefore.lastIndexOf('@')
    const textAfter = textarea.value.substring(cursor)
    input.value = textarea.value.substring(0, lastAtIndex) + textAfter
    
    nextTick(() => {
      textarea.setSelectionRange(lastAtIndex, lastAtIndex)
      textarea.focus()
    })
  }

  closeAtMenu()
}

function closeAtMenu() {
  atMenu.visible = false
  atMenu.selectedType = null
  atMenu.instances = []
}

function handleAtKeydown(e: KeyboardEvent) {
  if (!atMenu.visible) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    const max = atMenu.step === 1 ? atMenu.types.length : filteredAtInstances.value.length
    atMenu.selectedIndex = (atMenu.selectedIndex + 1) % max
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    const max = atMenu.step === 1 ? atMenu.types.length : filteredAtInstances.value.length
    atMenu.selectedIndex = (atMenu.selectedIndex - 1 + max) % max
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (atMenu.step === 1) {
      selectAtType(atMenu.types[atMenu.selectedIndex])
    } else {
      confirmAtReference(filteredAtInstances.value[atMenu.selectedIndex])
    }
  } else if (e.key === 'Escape') {
    closeAtMenu()
  } else if (e.key === 'Backspace' && atMenu.step === 2 && !atMenu.search) {
    e.preventDefault()
    atMenu.step = 1
    atMenu.selectedIndex = 0
  }
}

function renderMarkdown(content: string) {
  try {
    return marked.parse(content || '')
  } catch (e) {
    return content
  }
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

// --- AI 上下文统一处理引擎 ---
/**
 * 负责将原始项目数据转换为 AI 易于理解、无技术噪音、且带有语义说明的上下文快照。
 * 已升级：基于 schemaRegistry 进行动态字段过滤与数据清洗。
 */
function getToolLabel(name: string) {
  const tool = AI_TOOLS.find(t => t.name === name)
  return tool?.description.split('：')[0] || name
}

function formatArgs(raw: string) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch (e) {
    return raw
  }
}

function getToolResultForCall(callId: string) {
  // 从历史记录中查找对应的 tool 角色消息
  for (const msg of displayHistory.value) {
    if (msg.role === 'tool' && msg.toolResults) {
      const found = msg.toolResults.find(r => r.toolCallId === callId)
      if (found) return found
    }
  }
  return null
}

/**
 * 判断工具是否已被拒绝
 */
function isToolRejected(callId: string) {
  const result = getToolResultForCall(callId);
  if (!result) return false;
  try {
    const data = JSON.parse(result.content);
    return data.status === 'rejected';
  } catch (e) {
    return false;
  }
}

/**
 * 判断工具是否执行失败
 */
function isToolFailed(callId: string) {
  const result = getToolResultForCall(callId);
  if (!result) return false;
  try {
    const data = JSON.parse(result.content);
    return data.status === 'error';
  } catch (e) {
    return false;
  }
}

const ENTITY_TYPE_LABEL: Record<string, string> = {
  character:    '角色',
  worldview:    '世界观',
  relationship: '关系',
  timeline:     '时间线',
  chapters:     '章节',
  manuscript:   '正文',
}

function truncate(text: string, maxLen: number, suffix = '...') {
  return text.length > maxLen ? text.slice(0, maxLen) + suffix : text
}

function entityTypeLabel(type: string) {
  return ENTITY_TYPE_LABEL[type] ?? type
}

function resolveEntityDisplayId(type: string, id: string): string {
  const opt = (aiStore.getContextOptions(type) as any[]).find(o => o.id === id)
  return opt?.label ?? DEBUG_ENTITY_NAME_MAP[type]?.[id] ?? id
}

function upsertDebugToolResult(toolCallId: string, payload: Record<string, any>) {
  const content = JSON.stringify(payload, null, 2)

  for (const msg of debugMockHistory.value) {
    if (msg.role !== 'tool' || !msg.toolResults) continue

    const index = msg.toolResults.findIndex(result => result.toolCallId === toolCallId)
    if (index !== -1) {
      msg.toolResults[index] = { toolCallId, content }
      return
    }
  }

  const lastToolMsg = [...debugMockHistory.value].reverse().find(msg => msg.role === 'tool')
  if (lastToolMsg) {
    lastToolMsg.toolResults = [...(lastToolMsg.toolResults || []), { toolCallId, content }]
    return
  }

  debugMockHistory.value.push({
    id: `debug-tool-${Date.now()}`,
    role: 'tool',
    content: '',
    type: 'text',
    toolResults: [{ toolCallId, content }],
    timestamp: Date.now()
  })
}

function applyDebugTool(call: AIToolCall) {
  debugExecutedToolCallIds.add(call.id)
  expandedToolCallIds.delete(call.id)
  upsertDebugToolResult(call.id, {
    status: 'success',
    message: '调试预览：已模拟执行该操作。'
  })
  uiStore.showToast('调试预览：已模拟执行', 'success')
}

function rejectDebugTool(call: AIToolCall) {
  debugExecutedToolCallIds.add(call.id)
  expandedToolCallIds.delete(call.id)
  upsertDebugToolResult(call.id, {
    status: 'rejected',
    message: '调试预览：已模拟拒绝该操作。'
  })
  uiStore.showToast('调试预览：已模拟拒绝', 'info')
}

type ToolSummaryHandler = (args: any, callId?: string) => string

const TOOL_SUMMARY_HANDLERS: Record<string, ToolSummaryHandler> = {

  editTextBlock(args) {
    const preview = truncate(args.search_text || '', 20)
    return `修正正文中的 "${preview}"`
  },

  upsertEntities(args) {
    const entities: any[] = args.entities || []
    if (entities.length === 0) return '同步设定'
    const actions = entities.map((e) => {
      const label = entityTypeLabel(e.type)
      const name  = (e.name || '').trim()
      return e.id
        ? `修改${label} \`${name || e.id}\``
        : `创建${label} \`${name}\``
    })
    return actions.join('、')
  },

  deleteEntities(args) {
    const entities: any[] = args.entities || []
    if (entities.length === 0) return '删除实体'
    const previews = entities.slice(0, 3).map((e) => {
      const label = entityTypeLabel(e.type)
      const display = resolveEntityDisplayId(e.type, e.id)
      return `${label} \`${display}\``
    })
    const suffix = entities.length > 3 ? ` 等 ${entities.length} 项` : ''
    return `删除 ${previews.join('、')}${suffix}`
  },

  getEntityList(args) {
    return `获取全部${entityTypeLabel(args.type)}`
  },

  getEntityDetail(args) {
    const label   = entityTypeLabel(args.type)
    const idList: string[] = Array.isArray(args.ids) ? args.ids : (args.ids ? [args.ids] : [])
    if (idList.length === 0) return `获取${label}详细信息`
    const resolved = idList.slice(0, 3).map(id => resolveEntityDisplayId(args.type, id))
    const preview  = resolved.join('、')
    const suffix   = idList.length > 3 ? ` 等 ${idList.length} 个` : ' '
    return `获取${label} \`${preview}\`${suffix}详细信息`
  },

  searchEntities(args, callId?: string) {
    const label   = args.type ? entityTypeLabel(args.type) : '全部'
    const preview = truncate(args.query || '', 15, '....')
    
    // 尝试从工具结果中读取实际搜索结果数
    let suffix = ''
    if (callId) {
      const result = getToolResultForCall(callId)
      if (result) {
        try {
          const data = JSON.parse(result.content)
          if (data?.data?.count != null) {
            suffix = `（${data.data.count} 个结果）`
          }
        } catch (e) {
          // 解析失败，不显示数量
        }
      }
    }
    
    return `搜索${label}关键词 \`${preview}\`${suffix}`
  },

  getRelationGraph(_args) {
    return '生成人物关系图谱'
  },

  getEntitySchema(_args) {
    return '获取字段定义'
  },
}

function getToolSummary(call: AIToolCall): string {
  if (!call.function.arguments) return '分析意图中...'

  let args: any
  try {
    args = JSON.parse(call.function.arguments)
  } catch {
    return '解析参数中...'
  }

  const handler = TOOL_SUMMARY_HANDLERS[call.function.name]
  if (!handler) return call.function.name

  try {
    // 为searchEntities类型的处理器传递与callId，以便它能从结果中读取计数
    return handler(args, call.function.name === 'searchEntities' ? call.id : undefined)
  } catch {
    return call.function.name
  }
}

async function handleApplyTool(messageId: string, call: AIToolCall) {
  if (isDebugMockMode.value) {
    applyDebugTool(call)
    return
  }

  const toolName = call.function.name;
  console.group(`[AI Tool Engine] Applying Write-Tool: ${toolName}`);
  
  const tool = getTool(toolName);
  if (!tool) {
    console.error(`Tool ${toolName} not found in registry.`);
    console.groupEnd();
    return;
  }

  const ok = await uiStore.showConfirm({
    title: '确认执行 AI 操作',
    message: `AI 建议执行 “${getToolLabel(toolName)}”，是否继续？`,
    confirmText: '确认执行'
  })

  if (!ok) {
    console.groupEnd();
    return;
  }

  try {
    let args;
    try {
      args = JSON.parse(call.function.arguments)
    } catch (e: any) {
      let msg = 'AI 返回的指令参数格式错误';
      const posMatch = e.message.match(/at position (\d+)/) || e.message.match(/column (\d+)/);
      if (posMatch) {
        const pos = parseInt(posMatch[1]);
        const text = call.function.arguments;
        const start = Math.max(0, pos - 20);
        const end = Math.min(text.length, pos + 20);
        const snippet = text.substring(start, end);
        const pointer = ' '.repeat(pos - start) + '▲';
        msg += `: ${e.message}\n\nERROR CONTEXT:\n${snippet}\n${pointer}`;
      } else {
        msg += `: ${e.message}`;
      }
      throw new Error(msg);
    }
    
    projectStore.takeSnapshot()

    const context = { projectStore, characterStore, outlineStore, worldviewStore, uiStore };
    const result = await tool.execute(args, context);
    
    console.log('Tool execution successful:', result);
    aiStore.executedToolCallIds.add(call.id)
    expandedToolCallIds.delete(call.id) 

    uiStore.showToast(result.message || '操作成功', 'success')
    projectStore.markDirty()

    const toolOutput = result;

    // 将结果反馈给 AI 历史
    aiStore.addHistory('tool', result.message || '操作成功', 'text', {
      toolResults: [{
        toolCallId: call.id,
        content: JSON.stringify(toolOutput)
      }]
    })

    // 检查是否所有工具都已处理，若是则自动驱动下一轮生成
    await checkAndContinueAILoop(messageId);

  } catch (error: any) {
    console.error('Tool application failed:', error);
    uiStore.showToast(`执行失败: ${error.message}`, 'error')

    // 记录执行失败状态并反馈给 AI，以便其尝试纠正（由于参数错误或执行逻辑错误）
    aiStore.executedToolCallIds.add(call.id)
    
    aiStore.addHistory('tool', `Execution failed: ${error.message}`, 'text', {
      toolResults: [{
        toolCallId: call.id,
        content: JSON.stringify({ status: 'error', message: error.message })
      }]
    })

    // 即使失败也标记为已处理，并检查是否继续循环
    await checkAndContinueAILoop(messageId);
  } finally {
    console.groupEnd();
  }
}

/**
 * 拒绝执行 AI 建议的工具调用
 */
async function handleRejectTool(messageId: string, call: AIToolCall) {
  if (isDebugMockMode.value) {
    rejectDebugTool(call)
    return
  }

  const ok = await uiStore.showConfirm({
    title: '拒绝 AI 操作',
    message: `确定要拒绝执行 “${getToolLabel(call.function.name)}” 吗？\n拒绝后 AI 将得知该操作未被允许，并根据情况调整后续建议。`,
    confirmText: '确定拒绝',
    type: 'danger'
  })

  if (!ok) return;

  aiStore.executedToolCallIds.add(call.id)
  expandedToolCallIds.delete(call.id)

  // 反馈拒绝结果给 AI
  aiStore.addHistory('tool', 'User rejected this operation.', 'text', {
    toolResults: [{
      toolCallId: call.id,
      content: JSON.stringify({ status: 'rejected', message: 'User declined to execute this operation.' })
    }]
  })

  // 检查是否所有工具都已处理
  await checkAndContinueAILoop(messageId);
}

/**
 * 检查当前消息中的所有工具调用是否都已被处理（确认或拒绝）
 * 如果全部完成，则驱动下一轮 AI 生成
 */
async function checkAndContinueAILoop(messageId: string) {
  const msg = aiStore.history.find(m => m.id === messageId);
  if (!msg || !msg.toolCalls) return;

  const pendingCount = msg.toolCalls.filter(tc => 
    !readOnlyTools.includes(tc.function.name) && 
    !aiStore.executedToolCallIds.has(tc.id)
  ).length;

  if (pendingCount === 0) {
    console.log('[AI Store] All tools in message resolved, driving next loop.');
    await aiStore.sendMessage('', '', undefined, true);
  }
}

function addCurrentEntityToReference() {
  const path = router.currentRoute.value.path
  let type: any = null
  let id: any = ''
  let label: string = ''
  let range: { start: number, end: number } | undefined = undefined

  if (path === '/editor') {
    type = 'manuscript'
    if (uiStore.editorSelection) {
      id = `range:${uiStore.editorSelection.startLine}-${uiStore.editorSelection.endLine}`
      label = `正文: ${uiStore.editorSelection.startLine}-${uiStore.editorSelection.endLine}`
      range = { start: uiStore.editorSelection.startLine, end: uiStore.editorSelection.endLine }
    } else {
      uiStore.showToast('请先在正文中选择一段文字', 'warning')
      return
    }
  } else if (path === '/outline') {
    type = 'outline'
    if (uiStore.editorSelection) {
      id = `range:${uiStore.editorSelection.startLine}-${uiStore.editorSelection.endLine}`
      label = `大纲: ${uiStore.editorSelection.startLine}-${uiStore.editorSelection.endLine}`
      range = { start: uiStore.editorSelection.startLine, end: uiStore.editorSelection.endLine }
    } else {
      uiStore.showToast('请先在大纲编辑器中选择文字', 'warning')
      return
    }
  } else if (path === '/characters') {
    if (characterStore.activeCharacterId) {
      const char = characterStore.charactersInPhase.find(c => c.id === characterStore.activeCharacterId)
      if (char) {
        type = 'character'
        id = char.id
        label = `角色: ${char.name}`
      }
    }
  } else if (path === '/worldview') {
    if (worldviewStore.activeCategoryType) {
      const cat = worldviewStore.worldview?.categories.find(c => c.type === worldviewStore.activeCategoryType)
      if (cat) {
        type = 'worldview'
        id = cat.type
        label = `设定: ${cat.name}`
      }
    }
  } else if (path === '/timeline') {
    type = 'timeline'
    id = 'timeline_default'
    label = '参考: 时间线'
  }

  if (type) {
    if (!aiStore.referenceKeys.includes(type)) {
      aiStore.referenceKeys.push(type)
    }
    
    if ((type === 'manuscript' || type === 'outline') && range) {
       // 这是一个特殊的范围引用
       if (!aiStore.granularSelections[type]) aiStore.granularSelections[type] = []
       const existing = aiStore.granularSelections[type].find((item: any) => 
         typeof item === 'object' && item.start === range!.start && item.end === range!.end
       )
       if (!existing) {
         aiStore.granularSelections[type].push({ ...range, label })
       }
    } else {
      if (!aiStore.granularSelections[type]) aiStore.granularSelections[type] = []
      if (!aiStore.granularSelections[type].includes(id)) {
        aiStore.granularSelections[type].push(id)
      }
    }
    uiStore.showToast(`已引用 ${label}`, 'success')
  } else {
    uiStore.showToast('当前页面没有可引用的具体内容', 'info')
  }
}

const canReferenceCurrent = computed(() => {
  const path = router.currentRoute.value.path
  if (path === '/editor' || path === '/outline') {
    return !!uiStore.editorSelection
  }
  if (path === '/characters') {
    return !!characterStore.activeCharacterId
  }
  if (path === '/worldview') {
    return !!worldviewStore.activeCategoryType
  }
  if (path === '/timeline') {
    return true // 时间线是全局的，始终可以引用
  }
  return false
})

async function send() {
  if (isDebugMockMode.value) {
    uiStore.showToast('请先关闭 UI 调试预览，再发送真实消息', 'info')
    return
  }

  if (!input.value.trim() || aiStore.isProcessing) return

  const userContent = input.value.trim()
  let fullPrompt = userContent

  // 1. 构建参考上下文提示词 (Chip 引用系统由 computed 驱动)
  const refLines = activeReferences.value.map(r => {
    const typeLabel = atMenu.types.find(t => t.value === r.type)?.label || r.type
    
    // 如果引用的是 "所有"，则在 Prompt 中列出具体包含的列表，帮助 AI 识别 ID
    if (r.id === 'all') {
      const children = aiStore.getContextOptions(r.type)
      const childList = children.map((c: any) => `${c.label}(ID:${c.id})`).join('、')
      return `- [@${r.label}] (类型:${typeLabel}, ID:all, 包含子项: ${childList || '空'})`
    }
    
    return `- [@${r.label}] (类型:${typeLabel}, ID:${r.id})`
  })

  // 判定是否需要注入引用描述
  if (refLines.length > 0) {
    const refLinesText = refLines.join('\n')
    const refNotice = `(提示：索引仅包含 ID 和名称。若需分析具体内容，请务必通过调用工具获取详情)`
    const refSection = `### 本次对话引用的实体索引 ###\n${refLinesText}\n${refNotice}\n`
    
    // 如果没有使用模板，或者模板中没有 [REFERENCES] 标记，则维持原样将引用信息加在头部
    const promptTemplate = selectedPromptId.value ? aiStore.allPrompts.find(p => p.id === selectedPromptId.value)?.content : null
    
    if (!promptTemplate || !promptTemplate.includes('[REFERENCES]')) {
      fullPrompt = refSection + '\n' + fullPrompt
    }
  }

  // 2. 选择提示词模板的处理
  if (selectedPromptId.value) {
    const prompt = aiStore.allPrompts.find(p => p.id === selectedPromptId.value)
    if (prompt) {
      let templatedPrompt = prompt.content
      
      // 处理显式引用标记
      if (templatedPrompt.includes('[REFERENCES]')) {
        const refContent = refLines.length > 0 
          ? `${refLines.join('\n')}` 
          : '（本次对话中，用户未显式引用特定实体）'
        templatedPrompt = templatedPrompt.replace('[REFERENCES]', refContent)
      }

      // 处理用户输入和弃用标记
      fullPrompt = templatedPrompt
        .replace('[USER_INPUT]', fullPrompt)
    }
  }

  // 3. 发送消息
  await aiStore.sendMessage(userContent, fullPrompt)
  
  // 4. 发送后清理状态
  input.value = ""
  selectedPromptId.value = ""
  aiStore.referenceKeys = []
  aiStore.granularSelections = {}
  
  await nextTick()
  scrollHistoryToBottom()
}

watch(() => aiStore.isVisible, async (val) => {
  if (val) {
    // 处理待定输入
    if (aiStore.pendingInput) {
      input.value = aiStore.pendingInput
      aiStore.pendingInput = '' // 消费后清除
    }
    
    // 展开所有被激活的精细化类目
    expandActiveKeys()

    // 每一打开都滚动到底部
    await nextTick()
    scrollHistoryToBottom()
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

watch([() => aiStore.history.length, () => isDebugMockMode.value], async () => {
  await nextTick()
  scrollHistoryToBottom()
})

async function copyContent(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    uiStore.showToast('已复制到剪贴板', 'success')
  } catch (err) {
    uiStore.showToast('复制失败', 'error')
  }
}

// 宽度调整逻辑
let isResizing = false

function startResize() {
  isResizing = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function handleResize(e: MouseEvent) {
  if (!isResizing || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const newWidth = rect.right - e.clientX
  uiStore.setRightPanelWidth(newWidth)
}

function stopResize() {
  if (!isResizing) return
  isResizing = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onUnmounted(() => {
  stopResize()
})
</script>

<style scoped>
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
  width: 0 !important;
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
