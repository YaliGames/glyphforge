<template>
  <div class="flex-1 flex overflow-hidden bg-app-main">
    <!-- 左侧目录：仅显示分类 -->
    <SidePanel title="设定维度" width="w-64" side="left">
      <template #actions>
        <IconButton
          icon="fa-solid fa-plus"
          size="sm"
          variant="primary"
          title="添加新维度"
          @click="createNewCategory"
        />
      </template>

      <div class="p-2 space-y-2">
        <Input
          v-model="searchQuery"
          icon-prefix="fa-solid fa-search"
          placeholder="搜索设定分类..."
        />

        <nav class="space-y-1" v-if="worldviewStore.worldview">
          <div
            v-for="cat in filteredCategories"
            :key="cat.type"
            @click="activeCategoryType = cat.type"
            :class="[
              'group p-2 rounded-main cursor-pointer transition-all duration-200 relative hover:translate-x-0.5 border border-transparent',
              activeCategoryType === cat.type
                ? 'bg-app-active text-blue-600 dark:text-blue-400 shadow-sm border-divider dark:border-transparent'
                : 'hover:bg-app-hover text-gray-600 dark:text-gray-400',
            ]"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center min-w-0">
                <i
                  :class="getCategoryIcon(cat.type)"
                  class="text-[10px] opacity-70 group-hover:text-blue-500 transition-colors mr-2"
                ></i>
                <span class="text-xs truncate font-medium pr-1">{{
                  cat.name
                }}</span>
              </div>
              <div class="flex items-center w-0 group-hover:w-[60px] transition-all duration-200 justify-end shrink-0 overflow-hidden">
                <SidebarActionGroup
                  class="opacity-0 group-hover:opacity-100"
                  :can-move-up="
                    worldviewStore.worldview.categories.indexOf(cat) !== 0
                  "
                  :can-move-down="
                    worldviewStore.worldview.categories.indexOf(cat) !==
                    worldviewStore.worldview.categories.length - 1
                  "
                  @move-up="worldviewStore.moveCategory(cat.type, 'up')"
                  @move-down="worldviewStore.moveCategory(cat.type, 'down')"
                  @delete="confirmRemoveCategory(cat)"
                />
              </div>
            </div>
            <div class="flex items-center justify-between mt-1">
              <span class="text-ui-detail ml-5">{{
                cat.summary || "暂无摘要"
              }}</span>
              <span
                class="text-[9px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1 rounded shrink-0"
                >{{ cat.details.length }}</span
              >
            </div>
          </div>
        </nav>
      </div>
    </SidePanel>

    <!-- 主要内容区：仅显示当前激活的分类 -->
    <div
      class="flex-1 overflow-y-auto custom-scrollbar bg-app-main view-transition"
    >
      <div v-if="activeCategory" class="max-w-4xl mx-auto p-8 space-y-12 pb-24">
        <!-- 头部：参考角色面板 -->
        <header
          class="flex items-center justify-between border-b border-divider pb-6"
        >
          <div class="flex items-baseline gap-4">
            <h1 class="text-ui-title flex items-center">
              <i
                :class="getCategoryIcon(activeCategory.type)"
                class="text-blue-500/80 mr-3 text-xl"
              ></i>
              {{ activeCategory.name }}
            </h1>
            <span class="text-ui-badge uppercase tracking-wider">{{
              activeCategory.type
            }}</span>
          </div>
          <div
            v-if="settingsStore.getSettings()['ai.enabled']"
            class="flex items-center gap-2"
          >
            <AIButton
              @click="openAIAssistant(activeCategory)"
              class="!px-3 !py-1.5 shadow-purple-500/20"
            >
              AI 灵感
            </AIButton>
          </div>
        </header>

        <section class="space-y-4">
          <div class="flex items-center justify-between border-b border-divider pb-2">
            <h3 class="text-ui-header flex items-center gap-2">
              <i class="fa-solid fa-book text-[10px]"></i>
              基本设定
            </h3>
          </div>
          <div class="grid grid-cols-1 gap-4">
            <Input
              v-model="activeCategory.summary"
              type="textarea"
              label="核心概述"
              icon-prefix="fa-solid fa-align-left"
              placeholder="描述该方面世界观的核心设定..."
              :rows="3"
              @focus="startEdit()"
              @blur="endEdit()"
            />
          </div>
        </section>

        <!-- 详情描述列表 -->
        <section class="space-y-4">
          <div
            class="flex items-center justify-between border-b border-divider pb-2"
          >
            <h3 class="text-ui-header flex items-center gap-2">
              <i class="fa-solid fa-list-check text-[10px]"></i>
              详情条目
            </h3>
            <Button
              size="sm"
              icon="fa-solid fa-plus text-[8px]"
              @click="addDetailItem(activeCategory)"
            >
              添加条目
            </Button>
          </div>
          <div class="grid grid-cols-1 gap-6">
            <div
              v-for="(_, itemIndex) in activeCategory.details"
              :key="itemIndex"
              class="border border-divider rounded-main p-4 space-y-3 bg-app-surface hover:border-blue-200 dark:hover:border-blue-900/30 transition-colors"
            >
              <!-- 条目标题 -->
              <div class="flex items-end gap-2">
                <Input
                  v-model="activeCategory.details[itemIndex].title"
                  placeholder="标题"
                  class="flex-1"
                  @focus="startEdit()"
                  @blur="endEdit()"
                />
                <IconButton
                  icon="fa-solid fa-trash-can"
                  size="sm"
                  variant="danger"
                  title="删除条目"
                  @click="removeDetailItem(activeCategory, itemIndex)"
                />
              </div>

              <!-- 分段列表 -->
              <div class="border-t border-divider pt-3 space-y-2">
                <div class="flex items-center justify-between mb-2">
                  <label class="text-ui-label text-xs">内容</label>
                  <button
                    @click="addSection(activeCategory, itemIndex)"
                    class="text-[10px] text-blue-500 hover:underline"
                  >
                    + 添加分段
                  </button>
                </div>

                <div
                  v-for="(_, sectionIndex) in activeCategory.details[itemIndex].sections"
                  :key="`section-${itemIndex}-${sectionIndex}`"
                  class="group/section relative"
                >
                  <Input
                    v-model="activeCategory.details[itemIndex].sections[sectionIndex]"
                    type="textarea"
                    placeholder="输入内容..."
                    auto-resize
                    :rows="2"
                    @focus="startEdit()"
                    @blur="endEdit()"
                  />
                  
                  <!-- 分段操作按钮（使用 SidebarActionGroup） -->
                  <div class="absolute top-1 right-1 flex items-center w-0 group-hover/section:w-[60px] transition-all duration-200 justify-end overflow-hidden">
                    <SidebarActionGroup
                      class="opacity-0 group-hover/section:opacity-100"
                      :can-move-up="sectionIndex !== 0"
                      :can-move-down="sectionIndex !== activeCategory.details[itemIndex].sections.length - 1"
                      @move-up="moveSectionUp(activeCategory, itemIndex, sectionIndex)"
                      @move-down="moveSectionDown(activeCategory, itemIndex, sectionIndex)"
                      @delete="removeSection(activeCategory, itemIndex, sectionIndex)"
                    />
                  </div>
                </div>

                <div
                  v-if="activeCategory.details[itemIndex].sections.length === 0"
                  class="py-6 text-center text-gray-400 text-[10px] border border-dashed border-divider rounded bg-gray-50 dark:bg-gray-900/20"
                >
                  暂无分段，点击"添加分段"开始编写
                </div>
              </div>
            </div>

            <div
              v-if="activeCategory.details.length === 0"
              class="py-16 text-center border-2 border-dashed border-divider rounded-main flex flex-col items-center gap-3 text-gray-400"
            >
              <i class="fa-solid fa-feather-pointed text-2xl opacity-10"></i>
              <p class="text-[11px]">点击右上角“添加条目”开始构建细节</p>
            </div>
          </div>
        </section>
      </div>

      <!-- 空状态 -->
      <EmptyState
        v-else
        class="h-full"
        icon="fa-book-atlas"
        title="选择或创建设定维度"
        subtitle="地理、政治、魔法、习俗... 每一个维度都是构建宏大叙事的基石。"
      />
    </div>

    <!-- 弹窗组已移至 GlobalModals -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useWorldviewStore } from "@/store/worldview";
import { useUIStore } from "@/store/ui";
import { useSettingsStore } from "@/store/settings";
import { shouldConfirmDelete } from "@/utils/deleteConfirmation";
import { useProjectStore } from "@/store/project";
import { useAIStore } from "@/store/ai";
import { useFieldHistory } from "@/composables/useFieldHistory";
import { WORLDVIEW_PRESET_CATEGORIES } from "@/config";
import SidePanel from "@/components/layout/SidePanel.vue";
import AIButton from "@/components/common/AIButton.vue";
import Button from "@/components/common/Button.vue";
import IconButton from "@/components/common/IconButton.vue";
import Input from "@/components/common/Input.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import SidebarActionGroup from "@/components/layout/SidebarActionGroup.vue";

const worldviewStore = useWorldviewStore();
const projectStore = useProjectStore();
const uiStore = useUIStore();
const settingsStore = useSettingsStore();
const aiStore = useAIStore();
const { startEdit, endEdit } = useFieldHistory();

const searchQuery = ref("");

const activeCategoryType = computed({
  get: () => worldviewStore.activeCategoryType,
  set: (val) => (worldviewStore.activeCategoryType = val),
});

const activeCategory = computed(() => {
  return (
    worldviewStore.worldview?.categories.find(
      (c) => c.type === activeCategoryType.value
    ) || null
  );
});

const filteredCategories = computed(() => {
  if (!worldviewStore.worldview) return [];
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return worldviewStore.worldview.categories;
  return worldviewStore.worldview.categories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(query) ||
      cat.summary.toLowerCase().includes(query)
  );
});

onMounted(() => {
  if (
    !activeCategoryType.value &&
    worldviewStore.worldview?.categories.length
  ) {
    activeCategoryType.value = worldviewStore.worldview.categories[0].type;
  }
});

// 根据类型获取图标
function getCategoryIcon(type: string) {
  const preset = WORLDVIEW_PRESET_CATEGORIES.find((p) => p.type === type);
  if (preset) return "fa-solid " + preset.icon;
  return "fa-solid fa-folder-open";
}

function openAIAssistant(cat: any) {
  const detailSummary = cat.details
    .map((item: any) => `${item.title}: ${item.sections.join(' ')}`)
    .join("；") || "暂无";
  aiStore.show({
    promptId: "builtin-worldview-design",
    granular: {
      worldview: [cat.type],
      timeline: "all",
      // 'character': 'all'
    },
    input: `正在深化【${cat.name}】相关设定。\n当前摘要：${
      cat.summary || "暂无"
    }\n已记录条目：${detailSummary}\n请基于这些点，推演三个更具深度的关联细节或可能产生的社会冲突点。`,
  });
}

const addDetailItem = (cat: any) => {
  projectStore.takeSnapshot();
  cat.details.push({
    title: "",
    sections: [""]
  });
};

const addSection = (cat: any, itemIndex: number) => {
  projectStore.takeSnapshot();
  cat.details[itemIndex].sections.push("");
};

const removeSection = (cat: any, itemIndex: number, sectionIndex: number) => {
  projectStore.takeSnapshot();
  cat.details[itemIndex].sections.splice(sectionIndex, 1);
};

const moveSectionUp = (cat: any, itemIndex: number, sectionIndex: number) => {
  if (sectionIndex === 0) return;
  projectStore.takeSnapshot();
  const sections = cat.details[itemIndex].sections;
  [sections[sectionIndex - 1], sections[sectionIndex]] = [sections[sectionIndex], sections[sectionIndex - 1]];
};

const moveSectionDown = (cat: any, itemIndex: number, sectionIndex: number) => {
  const sections = cat.details[itemIndex].sections;
  if (sectionIndex === sections.length - 1) return;
  projectStore.takeSnapshot();
  [sections[sectionIndex], sections[sectionIndex + 1]] = [sections[sectionIndex + 1], sections[sectionIndex]];
};

const removeDetailItem = (cat: any, index: number) => {
  const needsConfirm = shouldConfirmDelete('worldviewItem')
  
  if (needsConfirm) {
    uiStore.showConfirm({
      title: '删除设定条目',
      message: `确定要删除此条目吗？`,
      confirmText: '确定删除',
      cancelText: '取消',
      type: 'danger'
    }).then(confirmed => {
      if (confirmed) {
        projectStore.takeSnapshot()
        cat.details.splice(index, 1)
      }
    })
  } else {
    projectStore.takeSnapshot()
    cat.details.splice(index, 1)
  }
}

async function confirmRemoveCategory(cat: any) {
  const needsConfirm = shouldConfirmDelete('worldviewCategory')
  
  if (needsConfirm) {
    const confirmed = await uiStore.showConfirm({
      title: "删除设定维度",
      message: `确定要删除 "${cat.name}" 及其所有条目吗？`,
      confirmText: "确定删除",
      cancelText: "取消",
      type: "danger",
    });

    if (confirmed) {
      worldviewStore.removeCategory(cat.type);
    }
  } else {
    worldviewStore.removeCategory(cat.type)
  }
}

async function createNewCategory() {
  uiStore.openModal("new-category");
}
</script>

<style scoped>
/* 视图特有样式可以在此添加 */
</style>
