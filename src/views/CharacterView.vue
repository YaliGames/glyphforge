<template>
  <div class="flex-1 flex overflow-hidden bg-white dark:bg-[#1e1e1e]">
    <!-- 左侧：角色列表 (规范 2.1) -->
    <SidePanel title="角色库" width="w-64" side="left">
      <template #actions>
        <button @click="addCharacter"
          class="p-1.5 hover:bg-gray-200 dark:hover:bg-[#333333] rounded text-blue-600 dark:text-blue-400 transition-colors"
          title="新建角色">
          <i class="fa-solid fa-plus text-xs"></i>
        </button>
      </template>

      <div class="p-2 space-y-2">
        <div class="relative">
          <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400"></i>
          <input v-model="searchQuery" type="text" placeholder="搜索姓名 / 标签..."
            class="w-full bg-white dark:bg-[#2d2d2d] border dark:border-[#333333] rounded-md pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
        </div>

        <div class="space-y-1">
          <div v-for="char in filteredCharacters" :key="char.id" @click="activeCharacterId = char.id" :class="[
            'group p-2 rounded-lg cursor-pointer transition-all duration-200 relative hover:translate-x-0.5 border border-transparent',
            activeCharacterId === char.id
              ? 'bg-blue-50 dark:bg-[#37373d] text-blue-600 dark:text-blue-400 shadow-sm border-gray-100 dark:border-transparent'
              : 'hover:bg-gray-100 dark:hover:bg-[#2d2d2d] text-gray-600 dark:text-gray-400'
          ]">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-user-circle text-[10px] opacity-50"></i>
                <span class="text-xs font-bold truncate pr-1">
                  {{ char.base.name || '未命名角色' }}
                </span>
              </div>
              <div class="flex items-center w-[60px] shrink-0">
                <SidebarActionGroup 
                  :can-move-up="characterStore.characters.indexOf(char) !== 0"
                  :can-move-down="characterStore.characters.indexOf(char) !== characterStore.characters.length - 1"
                  @move-up="characterStore.moveCharacter(char.id, 'up')"
                  @move-down="characterStore.moveCharacter(char.id, 'down')"
                  @delete="removeCharacter(char.id)"
                />
              </div>
            </div>
            <div class="flex flex-wrap gap-1 ml-5">
              <span v-for="alias in char.base.aliases.slice(0, 2)" :key="alias"
                class="px-1 py-0.5 bg-white/50 dark:bg-black/20 text-gray-400 rounded text-[8px] font-mono leading-none">
                {{ alias }}
              </span>
              <span v-if="char.base.aliases.length > 2" class="text-[8px] text-gray-400">...</span>
            </div>
          </div>
        </div>
      </div>
    </SidePanel>

    <!-- 右侧：详情编辑区 (规范 2.2) -->
    <main class="flex-1 overflow-y-auto bg-white dark:bg-[#1e1e1e] animate-fade-in custom-scrollbar view-transition">
      <div v-if="activeCharacter" class="max-w-4xl mx-auto p-8 space-y-12 pb-24">
        <!-- 头部 -->
        <header class="flex items-center justify-between">
          <div class="flex items-baseline gap-4">
            <h1 class="text-2xl font-bold dark:text-gray-100">{{ activeCharacter.base.name }}</h1>
            <span class="text-xs text-gray-400 font-mono opacity-50">{{ activeCharacter.id }}</span>
          </div>
          <div v-if="settingsStore.getSettings()['ai.enabled']" class="flex items-center gap-2">
            <AIButton @click="openAIAssistant('builtin-character-design')" class="!px-3 !py-1.5 shadow-purple-500/20">
              AI 创作
            </AIButton>
          </div>
        </header>

        <!-- 角色基本信息 (规范 2.3) -->
        <section class="space-y-4">
          <div class="flex items-center justify-between border-b dark:border-[#333333] pb-2">
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <i class="fa-solid fa-address-card text-[10px]"></i>
              角色基本信息
            </h3>
          </div>

          <div
            class="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 rounded-xl border border-gray-100 dark:border-[#333] bg-gray-50/30 dark:bg-[#252525]/30">
            <div class="space-y-4">
              <div class="space-y-2">
                <label class="text-[10px] font-bold text-gray-500 uppercase">角色姓名</label>
                <input v-model="activeCharacter.base.name"
                  class="w-full bg-white dark:bg-[#1e1e1e] border dark:border-[#333333] rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="输入角色全名或核心称谓" @focus="startEdit()"
                  @blur="endEdit()" />
              </div>

              <div class="space-y-2">
                <label class="text-[10px] font-bold text-gray-500 uppercase">角色昵称 / 别名</label>
                <ChipInput v-model="activeCharacter.base.aliases" placeholder="输入昵称并回车..."
                  @focusin="startEdit()"
                  @focusout="endEdit()" />
              </div>

              <div class="space-y-2">
                <label class="text-[10px] font-bold text-gray-500 uppercase">角色阵营</label>
                <ChipInput v-model="activeCharacter.base.factions" placeholder="输入角色所属的组织、流派或社会地位"
                  @focusin="startEdit()"
                  @focusout="endEdit()" />
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-bold text-gray-500 uppercase">角色身份</label>
                <ChipInput v-model="activeCharacter.base.identities" placeholder="输入角色的具体职位、封号或社会标签"
                  @focusin="startEdit()"
                  @focusout="endEdit()" />
              </div>
            </div>

            <div class="space-y-4">
              <div class="space-y-2">
                <label class="text-[10px] font-bold text-gray-500 uppercase">外貌着装</label>
                <textarea v-model="activeCharacter.base.appearance" rows="3"
                  class="w-full bg-white dark:bg-[#1e1e1e] border dark:border-[#333333] rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
                  placeholder="描述角色的体貌特征、惯常穿着..." @focus="startEdit()"
                  @blur="endEdit()"></textarea>
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-bold text-gray-500 uppercase">性格特征</label>
                <textarea v-model="activeCharacter.base.personality" rows="3"
                  class="w-full bg-white dark:bg-[#1e1e1e] border dark:border-[#333333] rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
                  placeholder="角色的核心性格、行事逻辑..." @focus="startEdit()"
                  @blur="endEdit()"></textarea>
              </div>

              <div class="space-y-2">
                <label class="text-[10px] font-bold text-gray-500 uppercase">身份背景</label>
                <textarea v-model="activeCharacter.base.background" rows="8"
                  class="w-full bg-white dark:bg-[#1e1e1e] border dark:border-[#333333] rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
                  placeholder="角色的出身、过往经历、关键转折点..." @focus="startEdit()"
                  @blur="endEdit()"></textarea>
              </div>
            </div>
          </div>
        </section>

        <!-- 角色间关系 (基本信息下方，内联编辑) -->
        <section class="space-y-4">
          <div class="flex items-center justify-between border-b dark:border-[#333333] pb-2">
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <i class="fa-solid fa-users-between-lines text-[10px]"></i>
              角色间关系
            </h3>
            <button 
              @click="addRelation" 
              class="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
            >
              <i class="fa-solid fa-plus text-[8px]"></i> 建立新关系
            </button>
          </div>

          <div class="grid grid-cols-1 gap-3">
            <div v-for="rel in activeCharacter.relations" :key="rel.id"
              class="group flex items-center gap-4 p-4 bg-white dark:bg-[#1e1e1e] rounded-xl border dark:border-[#33] hover:border-blue-200 dark:hover:border-blue-900/40 transition-all shadow-sm">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-xs font-bold dark:text-gray-300">{{ activeCharacter.base.name }}</span>
                  <span class="text-[10px] text-gray-400">是</span>
                </div>

                <div class="flex gap-2 items-center flex-1">
                  <select v-model="rel.targetId"
                    class="bg-gray-50 dark:bg-[#252525] border dark:border-[#333] rounded px-2 py-1 text-xs outline-none focus:border-blue-500 min-w-[100px]"
                    @focus="projectStore.takeSnapshot()">
                    <option value="" disabled>选择角色</option>
                    <option v-for="c in otherCharacters" :key="c.id" :value="c.id">{{ c.base.name }}</option>
                  </select>
                  <span class="text-[10px] text-gray-400">的</span>
                  <input v-model="rel.type" placeholder="关系"
                    class="bg-gray-50 dark:bg-[#252525] border dark:border-[#333] rounded px-2 py-1 text-xs outline-none focus:border-blue-500 w-24"
                    @focus="startEdit()" @blur="endEdit()" />
                  <input v-model="rel.notes" placeholder="备注..."
                    class="bg-gray-50 dark:bg-[#252525] border dark:border-[#333] rounded px-2 py-1 text-xs outline-none focus:border-blue-500 flex-1"
                    @focus="startEdit()" @blur="endEdit()" />
                </div>
              </div>
              <button @click="removeRelation(rel.id)"
                class="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-colors">
                <i class="fa-solid fa-trash-can text-[10px]"></i>
              </button>
            </div>
            <div v-if="activeCharacter.relations.length === 0"
              class="py-10 text-center border-2 border-dashed dark:border-[#333] rounded-xl text-xs text-gray-400 italic">
              尚未定义任何社交关系
            </div>
          </div>
        </section>

        <!-- Phases：叙事阶段 (规范 3) -->
        <section class="space-y-6">
          <div class="flex items-center justify-between border-b dark:border-[#333333] pb-2">
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <i class="fa-solid fa-timeline text-[10px]"></i>
              叙事阶段 (Phases)
            </h3>
            <button 
              @click="addPhase"
              class="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
            >
              <i class="fa-solid fa-plus text-[9px]"></i> 新建阶段
            </button>
          </div>

          <div v-if="activeCharacter.phases.length === 0"
            class="py-12 text-center border-2 border-dashed dark:border-[#33] rounded-xl flex flex-col items-center gap-4 text-gray-400">
            <i class="fa-solid fa-layer-group text-3xl opacity-20"></i>
            <p class="text-[11px]">目前没有叙事阶段，角色在整个故事中保持初始状态</p>
          </div>

          <div v-else class="space-y-4">
            <div v-for="phase in activeCharacter.phases" :key="phase.id"
              class="border dark:border-[#333] rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e] shadow-sm transition-all duration-200"
              :class="{ 'ring-1 ring-blue-500/30': editingPhaseIds.has(phase.id) }">
              
              <!-- Header Bar -->
              <div
                class="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors"
                @click.stop="expandedPhaseIds.has(phase.id) ? expandedPhaseIds.delete(phase.id) : expandedPhaseIds.add(phase.id)">
                
                <div class="flex items-center gap-4 flex-1">
                  <!-- Expand Icon -->
                  <i class="fa-solid fa-chevron-right text-[10px] transition-transform duration-200"
                    :class="{ 'rotate-90': expandedPhaseIds.has(phase.id) }"></i>
                  
                  <div class="flex items-center gap-3">
                    <span v-if="!editingPhaseIds.has(phase.id)" class="text-sm font-bold dark:text-gray-200">{{ phase.label || '未命名阶段' }}</span>
                    <input v-else v-model="phase.label" 
                      @click.stop 
                      class="bg-transparent border-b border-blue-500/50 outline-none text-sm font-bold dark:text-gray-200 w-32"
                      placeholder="阶段名称" />
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button @click.stop="editingPhaseIds.has(phase.id) ? editingPhaseIds.delete(phase.id) : editingPhaseIds.add(phase.id); expandedPhaseIds.add(phase.id)"
                    class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    :class="editingPhaseIds.has(phase.id) ? 'text-blue-500' : 'text-gray-400'"
                    :title="editingPhaseIds.has(phase.id) ? '保存并退出编辑' : '编辑阶段'">
                    <i class="fa-solid" :class="editingPhaseIds.has(phase.id) ? 'fa-check' : 'fa-pen-to-square'"></i>
                  </button>
                  <button @click.stop="removePhase(phase.id)" 
                    class="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 transition-colors">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>

              <!-- Content Area (Expandable) -->
              <div v-if="expandedPhaseIds.has(phase.id)" 
                class="border-t dark:border-[#333] animate-in slide-in-from-top-2 duration-200">
                
                <!-- Edit Mode View -->
                <div v-if="editingPhaseIds.has(phase.id)" class="p-6 space-y-8">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div class="space-y-6">
                      <div class="space-y-2">
                        <label class="text-[10px] font-bold text-gray-500 uppercase">阶段叙事总结</label>
                        <textarea v-model="phase.summary" rows="4"
                          class="w-full bg-white dark:bg-[#1e1e1e] border dark:border-[#333333] rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none transition-all"
                          placeholder="描述此阶段角色的核心命题..." v-auto-resize @focus="startEdit()"
                          @blur="endEdit()"></textarea>
                      </div>
                      
                      <div class="space-y-4">
                        <div class="flex items-center justify-between">
                          <label class="text-[10px] font-bold text-gray-500 uppercase">阶段性关系变更</label>
                          <button @click="addPhaseRelation(phase)" 
                            class="text-[10px] text-blue-500 hover:underline">+ 增加关系覆盖</button>
                        </div>
                        <div class="grid grid-cols-1 gap-3">
                          <div v-for="rel in phase.overrides.relations || []" :key="rel.id"
                            class="group flex items-center gap-4 p-3 bg-blue-50/20 dark:bg-blue-900/5 rounded-xl border border-blue-100 dark:border-blue-900/20 transition-all">
                            <!-- 左侧两行布局 -->
                            <div class="flex-1 space-y-2.5">
                              <div class="flex items-center gap-2">
                                <!-- <span class="text-xs font-bold dark:text-gray-300 shrink-0">{{ activeCharacter.base.name }}</span> -->
                                <span class="text-[10px] text-gray-400 shrink-0">是</span>
                                <select v-model="rel.targetId"
                                  class="bg-white dark:bg-[#1e1e1e] border dark:border-[#33] rounded px-2 py-1 text-xs outline-none focus:ring-1 ring-blue-500/30"
                                  @focus="projectStore.takeSnapshot()">
                                  <option value="" disabled>选择角色</option>
                                  <option v-for="c in otherCharacters" :key="c.id" :value="c.id">{{ c.base.name }}</option>
                                </select>
                                <span class="text-[10px] text-gray-400 shrink-0">的</span>
                                <input v-model="rel.type" placeholder="关系 (如：生死之交)"
                                  class="bg-white dark:bg-[#1e1e1e] border dark:border-[#33] rounded px-2 py-1 text-xs w-32 outline-none focus:ring-1 ring-blue-500/30" />
                              </div>
                              <div class="flex items-center gap-2">
                                <i class="fa-solid fa-comment-dots text-[10px] text-blue-400/50"></i>
                                <input v-model="rel.notes" placeholder="阶段性备注：描述此阶段该关系的演变细节..."
                                  class="w-full bg-transparent border-b border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-blue-500/30 outline-none text-[10px] text-gray-500 py-0.5 transition-colors" />
                              </div>
                            </div>
                            
                            <!-- 最右侧删除 -->
                            <button @click="removePhaseRelation(phase, rel.id)" 
                              class="p-2 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                              <i class="fa-solid fa-trash-can text-[10px]"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="space-y-4">
                      <label class="text-[10px] font-bold text-gray-500 uppercase">属性覆盖 (Overrides)</label>
                      <div class="flex flex-wrap gap-2">
                        <button v-for="field in baseFields" :key="field.key" @click="toggleOverride(phase, field.key)"
                          :class="['px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all', (phase.overrides as any)[field.key] !== undefined ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white dark:bg-[#252525] border-gray-200 dark:border-[#33] text-gray-500 hover:border-blue-400']">
                          {{ field.label }}
                        </button>
                      </div>
                      <div class="space-y-4 pt-4 border-t dark:border-[#33]">
                        <template v-for="field in baseFields" :key="'ov-' + field.key">
                          <div v-if="(phase.overrides as any)[field.key] !== undefined"
                            class="space-y-2 animate-in slide-in-from-top-2 duration-200">
                            <label class="text-[10px] font-bold text-blue-500">重写 {{ field.label }}:</label>
                            <ChipInput
                              v-if="Array.isArray((activeCharacter.base as any)[field.key])"
                              v-model="(phase.overrides as any)[field.key]" />
                            <textarea v-else
                              v-model="(phase.overrides as any)[field.key]" rows="2"
                              class="w-full bg-blue-50/30 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500"
                              v-auto-resize></textarea>
                          </div>
                        </template>
                        <div v-if="Object.keys(phase.overrides).filter(k => k !== 'relations').length === 0"
                          class="py-4 text-center text-[10px] text-gray-400 italic">
                          未开启属性覆盖
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Browse Mode View -->
                <div v-else class="bg-gray-50/50 dark:bg-[#1a1a1a] p-6 space-y-6">
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <!-- Summary Col -->
                    <div class="md:col-span-1 space-y-4">
                      <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">阶段叙事</div>
                      <p class="text-xs leading-relaxed text-gray-600 dark:text-gray-400 italic">
                        {{ phase.summary || '暂无叙事总结' }}
                      </p>
                    </div>

                    <!-- Effective Stats Col -->
                    <div class="md:col-span-2 space-y-4">
                      <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">当前生效状态回顾</div>
                      <div v-if="getPhaseEffectiveCharacter(activeCharacter.id, phase.id)" class="grid grid-cols-2 gap-x-12 gap-y-4">
                        <div v-for="field in baseFields" :key="'preview-' + field.key" class="space-y-1">
                          <div class="text-[9px] text-gray-400">{{ field.label }}</div>
                          <div v-if="Array.isArray(getPhaseEffectiveCharacter(activeCharacter.id, phase.id)?.[field.key])" class="flex flex-wrap gap-1">
                            <span v-for="tag in (getPhaseEffectiveCharacter(activeCharacter.id, phase.id)?.[field.key] as string[])" :key="tag"
                              class="px-1.5 py-0.5 bg-gray-200 dark:bg-[#333] rounded text-[9px]">
                              {{ tag }}
                            </span>
                          </div>
                          <div v-else class="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                             {{ getPhaseEffectiveCharacter(activeCharacter.id, phase.id)?.[field.key] || '-' }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Phase Relations Preview -->
                  <div class="pt-4 border-t dark:border-gray-800">
                    <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">活跃关系网</div>
                    <div class="flex flex-wrap gap-3">
                      <div v-for="rel in (getPhaseEffectiveCharacter(activeCharacter.id, phase.id)?.relations || [])" :key="'pre-rel-'+rel.id"
                        class="px-3 py-1.5 bg-white dark:bg-[#252525] rounded-full border dark:border-[#333] text-[10px] flex items-center gap-2">
                        <span class="text-gray-400">是</span>
                        <span class="font-bold text-blue-500">{{ characterStore.characters.find(c => c.id === rel.targetId)?.base.name }}</span>
                        <span class="text-gray-400">的</span>
                        <span class="text-gray-600 dark:text-gray-300">{{ rel.type }}</span>
                        <span v-if="rel.notes" class="text-gray-400 italic">({{ rel.notes }})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 创作备注 (规范 2.5) -->
        <section class="space-y-6 pt-12 border-t dark:border-[#333]">
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">创作备注</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="space-y-2">
              <label class="text-[10px] font-bold text-gray-500 uppercase">作者私语</label>
              <textarea v-model="activeCharacter.notes.authorNotes" rows="4"
                class="w-full bg-white dark:bg-[#1e1e1e] border dark:border-[#333333] rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none transition-all"
                placeholder="灵感或计划..." @focus="startEdit()"
                @blur="endEdit()"></textarea>
            </div>
            <div class="space-y-2">
              <label class="text-[10px] font-bold text-gray-500 uppercase">待解悬念</label>
              <textarea v-model="activeCharacter.notes.openQuestions" rows="4"
                class="w-full bg-white dark:bg-[#1e1e1e] border dark:border-[#333333] rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none transition-all"
                placeholder="未解之谜..." @focus="startEdit()"
                @blur="endEdit()"></textarea>
            </div>
          </div>
        </section>
      </div>

      <!-- 空状态 -->
      <EmptyState
        v-else
        icon="fa-user-pen"
        title="选择一个角色开始设计"
        subtitle="“文学形象是一个完整的生命，而非属性的堆砌。”"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCharacterStore } from '@/store/characters'
import { useUIStore } from '@/store/ui'
import { useSettingsStore } from '@/store/settings'
import { useProjectStore } from '@/store/project'
import { useAIStore } from '@/store/ai'
import { useFieldHistory } from '@/composables/useFieldHistory'
import SidePanel from '@/components/common/SidePanel.vue'
import ChipInput from '@/components/common/ChipInput.vue'
import SidebarActionGroup from '@/components/common/SidebarActionGroup.vue'
import AIButton from '@/components/common/AIButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { CharacterPhase } from '@/types'
import { v4 as uuidv4 } from 'uuid'

const characterStore = useCharacterStore()
const projectStore = useProjectStore()
const uiStore = useUIStore()
const settingsStore = useSettingsStore()
const aiStore = useAIStore()
const { startEdit, endEdit } = useFieldHistory()

const searchQuery = ref('')
const activeCharacterId = computed({
  get: () => characterStore.activeCharacterId,
  set: (val) => characterStore.activeCharacterId = val
})

// UI 状态：记录哪些阶段处于展开状态，哪些处于编辑模式
const expandedPhaseIds = ref<Set<string>>(new Set())
const editingPhaseIds = ref<Set<string>>(new Set())

// 自动调整高度指令
const vAutoResize = {
  mounted: (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
    el.addEventListener('input', () => {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    })
  }
}

const filteredCharacters = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return characterStore.characters
  return characterStore.characters.filter(c =>
    c.base.name.toLowerCase().includes(query) ||
    c.base.aliases.some(t => t.toLowerCase().includes(query)) ||
    c.base.factions.some(t => t.toLowerCase().includes(query)) ||
    c.base.identities.some(t => t.toLowerCase().includes(query))
  )
})

const activeCharacter = computed(() => {
  return characterStore.characters.find(c => c.id === activeCharacterId.value) || null
})

const otherCharacters = computed(() => {
  return characterStore.characters.filter(c => c.id !== activeCharacterId.value)
})

const addCharacter = () => {
  const newChar = characterStore.addCharacter('新角色')
  if (newChar) {
    activeCharacterId.value = newChar.id
  }
}

function openAIAssistant(promptId = 'builtin-character-design') {
  if (!activeCharacter.value) return

  // 现在 show 方法支持 'all' 直接全选分类，且自动处理 keys 的启用
  aiStore.show({
    promptId: promptId,
    granular: {
      'characters': [activeCharacter.value.id],
      'worldview_categories': 'all',
      'worldview_timeline': 'all'
    },
    input: '请基于以上勾选的世界观背景与历史设定，为我深化并完善该角色的档案。'
  })
}

const removeCharacter = async (id: string) => {
  const char = characterStore.characters.find(c => c.id === id)
  const name = char?.base.name || '未命名角色'

  const confirmed = await uiStore.showConfirm({
    title: '删除角色',
    message: `确定要删除角色 "${name}" 吗？此操作不可撤销。`,
    confirmText: '确定删除',
    cancelText: '取消',
    type: 'danger'
  })

  if (confirmed) {
    characterStore.removeCharacter(id)
    if (activeCharacterId.value === id) {
      activeCharacterId.value = characterStore.characters[0]?.id || null
    }
  }
}

const addPhase = () => {
  if (!activeCharacterId.value) return
  const newPhase = characterStore.addPhase(activeCharacterId.value, '新阶段')
  if (newPhase) {
    // 新建阶段默认开启编辑模式且展开
    expandedPhaseIds.value.add(newPhase.id)
    editingPhaseIds.value.add(newPhase.id)
  }
}

const removePhase = async (phaseId: string) => {
  const confirmed = await uiStore.showConfirm({
    title: '删除阶段',
    message: '确定要删除这个阶段吗？',
    confirmText: '确定删除',
    cancelText: '取消',
    type: 'danger'
  })

  if (confirmed && activeCharacterId.value) {
    characterStore.removePhase(activeCharacterId.value, phaseId)
  }
}

const addRelation = () => {
  if (!activeCharacterId.value) return
  characterStore.addRelation(activeCharacterId.value)
}

const removeRelation = (relId: string) => {
  if (!activeCharacterId.value) return
  characterStore.removeRelation(activeCharacterId.value, relId)
}

// 阶段覆盖字段管理
const baseFields = [
  { key: 'name', label: '角色姓名' },
  { key: 'aliases', label: '角色昵称' },
  { key: 'factions', label: '角色阵营' },
  { key: 'identities', label: '角色身份' },
  { key: 'appearance', label: '外貌着装' },
  { key: 'personality', label: '性格特征' },
  { key: 'background', label: '身份背景' }
] as const

const toggleOverride = (phase: CharacterPhase, fieldKey: string) => {
  projectStore.takeSnapshot() // 修改前快照
  if (phase.overrides[fieldKey as keyof typeof phase.overrides] !== undefined) {
    delete (phase.overrides as any)[fieldKey]
  } else {
    const baseValue = (activeCharacter.value?.base as any)[fieldKey]
    if (Array.isArray(baseValue)) {
      (phase.overrides as any)[fieldKey] = [...baseValue]
    } else {
      (phase.overrides as any)[fieldKey] = baseValue
    }
  }
}

const addPhaseRelation = (phase: CharacterPhase) => {
  projectStore.takeSnapshot() // 修改前快照
  if (!phase.overrides.relations) {
    phase.overrides.relations = []
  }
  phase.overrides.relations.push({
    id: uuidv4(),
    targetId: '',
    type: '',
    notes: ''
  })
}

const removePhaseRelation = (phase: CharacterPhase, relId: string) => {
  if (phase.overrides.relations) {
    const idx = phase.overrides.relations.findIndex((r: any) => r.id === relId)
    if (idx !== -1) {
      projectStore.takeSnapshot() // 修改前快照
      phase.overrides.relations.splice(idx, 1)
    }
  }
}

// 获取特定阶段的有效角色数据
const getPhaseEffectiveCharacter = (charId: string, phaseId: string) => {
  const char = characterStore.characters.find(c => c.id === charId)
  if (!char) return null
  const phase = char.phases.find(p => p.id === phaseId)
  if (!phase) return null

  // 模拟 getEffectiveCharacter 的逻辑，但强制对准这个 Phase
  const baseCopy = JSON.parse(JSON.stringify(char.base))
  const effectiveRelations = JSON.parse(JSON.stringify(char.relations))

  if (phase.overrides) {
    Object.keys(phase.overrides).forEach(key => {
      if (key !== 'relations' && (phase.overrides as any)[key] !== undefined) {
        (baseCopy as any)[key] = (phase.overrides as any)[key]
      }
    })

    if (phase.overrides.relations) {
      phase.overrides.relations.forEach((overRel: any) => {
        const idx = effectiveRelations.findIndex((r: any) => r.targetId === overRel.targetId)
        if (idx !== -1) {
          effectiveRelations[idx] = { ...effectiveRelations[idx], ...overRel }
        } else {
          effectiveRelations.push(overRel)
        }
      })
    }
  }

  return { ...baseCopy, relations: effectiveRelations }
}
watch(() => activeCharacter.value, (newVal, oldVal) => {
  if (newVal && oldVal && newVal.id === oldVal.id) {
    projectStore.markDirty()
  }
}, { deep: true })
</script>

<style scoped>
/* 角色面板特有样式 */
</style>
