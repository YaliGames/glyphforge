<template>
  <div class="h-full w-full flex flex-col bg-gray-50 dark:bg-[#1e1e1e] relative group">
    <!-- 顶部菜单栏 -->
    <div class="h-12 border-b bg-white dark:bg-[#252525] dark:border-[#333] flex items-center px-4 justify-between z-10 shrink-0 shadow-sm">
      <div class="flex items-center gap-4">
        <!-- 模式切换 -->
        <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded p-1">
          <button @click="isConnectMode = false"
            class="px-3 py-1 text-xs rounded transition-all flex items-center gap-1.5"
            :class="!isConnectMode ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'">
            <i class="fa-solid fa-arrows-up-down-left-right"></i>移动模式
          </button>
          <button @click="isConnectMode = true"
            class="px-3 py-1 text-xs rounded transition-all flex items-center gap-1.5"
            :class="isConnectMode ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'">
            <i class="fa-solid fa-link"></i>连线模式
          </button>
        </div>

        <div class="h-4 w-[1px] bg-gray-200 dark:bg-gray-700"></div>

        <!-- 自动布局按钮 -->
        <button @click="runForceLayout"
          class="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-xs border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
          <i class="fa-solid fa-arrows-to-circle"></i>自动布局
        </button>
      </div>

      <div class="flex items-center gap-3">
        <!-- 视图控制 -->
        <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded p-1">
          <button @click="zoomIn" 
            class="w-7 h-7 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 rounded transition-all text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:shadow-sm" 
            title="放大">
            <i class="fa-solid fa-plus text-[11px] leading-none"></i>
          </button>
          <button @click="zoomOut" 
            class="w-7 h-7 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 rounded transition-all text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:shadow-sm" 
            title="缩小">
            <i class="fa-solid fa-minus text-[11px] leading-none"></i>
          </button>
          <div class="w-[1px] h-3 bg-gray-300 dark:bg-gray-700/50 mx-0.5"></div>
          <button @click="fitView" 
            class="w-7 h-7 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 rounded transition-all text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:shadow-sm" 
            title="自适应显示">
            <i class="fa-solid fa-expand text-[11px] leading-none"></i>
          </button>
          <button @click="isLocked = !isLocked" 
            class="w-7 h-7 flex items-center justify-center rounded transition-all shadow-sm"
            :class="isLocked ? 'text-blue-600 bg-white dark:bg-gray-700 font-medium' : 'text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-gray-700'"
            title="锁定视图">
            <i class="fa-solid text-[11px] leading-none" :class="isLocked ? 'fa-lock' : 'fa-lock-open'"></i>
          </button>
        </div>
        
        <div class="h-6 w-[1px] bg-gray-200 dark:bg-gray-700 mx-1"></div>
        
        <div class="text-[11px] text-gray-500 flex gap-4 mr-2">
          <span class="flex items-center gap-1">角色 <b class="text-gray-700 dark:text-gray-300">{{ nodesCount }}</b></span>
          <span class="flex items-center gap-1">关系 <b class="text-gray-700 dark:text-gray-300">{{ edgesCount }}</b></span>
        </div>
      </div>
    </div>

    <!-- 图谱区域 -->
    <div class="flex-1 relative overflow-hidden">
      <VueFlow v-model="elements" :fit-view-on-init="true" class="h-full w-full" :default-zoom="1.0" :min-zoom="0.2"
        :max-zoom="4" :nodes-draggable="!isConnectMode && !isLocked" :nodes-connectable="isConnectMode && !isLocked"
        :pan-on-drag="!isConnectMode && !isLocked" :zoom-on-scroll="!isConnectMode && !isLocked"
        :zoom-on-double-click="!isConnectMode && !isLocked" @connect="onConnect" @edge-click="onEdgeClick"
        @node-click="onNodeClick" @node-drag-start="menu.visible = false" @node-drag-stop="onNodeDragStop"
        @pane-click="onPaneClickHandle">
        <Background pattern-color="#aaa" gap="8" />

        <!-- 注册自定义节点 -->
        <template #node-character="props">
          <CharacterNode v-bind="props" />
        </template>

        <!-- 注册自定义连线 -->
        <template #edge-custom="props">
          <CustomEdge v-bind="props" />
        </template>

        <!-- 右侧浮动提示 -->
        <Panel position="top-right" v-if="isConnectMode"
          class="bg-blue-600 text-white px-3 py-1.5 rounded-full shadow-lg text-[11px] font-medium flex items-center gap-2 m-4 animate-bounce">
          <i class="fa-solid fa-circle-info"></i>
          连线模式已开启：按住一个节点拖向另一个节点以建立关系
        </Panel>
      </VueFlow>
    </div>

    <!-- Context Menu -->
    <div v-if="menu.visible"
      class="fixed z-50 bg-white dark:bg-[#252525] shadow-xl rounded-lg border dark:border-[#333] py-1 min-w-[120px] menu-enter-active"
      :style="{ left: menu.x + 'px', top: menu.y + 'px' }" @click.stop>
      <div v-if="menu.type === 'edge'" class="flex flex-col">
        <button @click="handleEdit"
          class="px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-[#333] dark:text-gray-200">
          <i class="fa-solid fa-pen-to-square mr-2 text-blue-500"></i>编辑详情
        </button>
        <button @click="handleDelete"
          class="px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-[#333] text-red-500">
          <i class="fa-solid fa-trash-can mr-2"></i>断绝关系
        </button>
      </div>
      <div v-if="menu.type === 'node'" class="flex flex-col">
        <button @click="handleEdit"
          class="px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-[#333] dark:text-gray-200">
          <i class="fa-solid fa-address-card mr-2 text-blue-500"></i>查看档案
        </button>
        <button @click="handleDelete"
          class="px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-[#333] text-red-500">
          <i class="fa-solid fa-user-xmark mr-2"></i>移除角色
        </button>
      </div>
    </div>

    <RelationshipEditModal v-model="showEditor" :relationship="editingRelationship" @save="saveRelationship"
      @delete="handleDelete" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { VueFlow, Panel, useVueFlow, Connection, EdgeMouseHandler, NodeDragHandler, NodeMouseHandler } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import CharacterNode from '@/components/features/relations/CharacterNode.vue'
import CustomEdge from '@/components/features/relations/CustomEdge.vue'
import RelationshipEditModal from '@/components/features/relations/RelationshipEditModal.vue'
import { useCharacterStore } from '@/store/characters'
import { useUIStore } from '@/store/ui'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { forceSimulation, forceLink, forceManyBody, forceX, forceY, forceCollide } from 'd3-force'

// Import Vue Flow styles
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

const characterStore = useCharacterStore()
const uiStore = useUIStore()
const router = useRouter()
const { charactersInPhase: characters, relationshipsInPhase: relationships } = storeToRefs(characterStore)
const { addEdges, removeEdges, zoomIn, zoomOut, fitView } = useVueFlow()

const elements = ref<any[]>([])
const isConnectMode = ref(false)
const isLocked = ref(false)

// 右键菜单状态
const menu = ref({
  visible: false,
  x: 0,
  y: 0,
  type: null as 'node' | 'edge' | null,
  id: '',
  data: null as any
})

// 编辑弹窗状态
const showEditor = ref(false)
const editingRelationship = ref<any>(null)

const onPaneClickHandle = () => {
  menu.value.visible = false
}

const onNodeClick: NodeMouseHandler = (event) => {
  event.event.preventDefault()
  event.event.stopPropagation()

  menu.value = {
    visible: true,
    x: event.event.clientX,
    y: event.event.clientY,
    type: 'node',
    id: event.node.id,
    data: event.node.data
  }
}

const onEdgeClick: EdgeMouseHandler = (event) => {
  event.event.preventDefault()
  event.event.stopPropagation()

  menu.value = {
    visible: true,
    x: event.event.clientX,
    y: event.event.clientY,
    type: 'edge',
    id: event.edge.id,
    data: event.edge.data
  }
}

// Menu Actions
const handleEdit = () => {

  if (menu.value.type === 'edge') {
    // Find relationship data
    const rel = relationships.value.find(r => r.id === menu.value.id)
    if (rel) {
      editingRelationship.value = rel
      showEditor.value = true
    }
  } else if (menu.value.type === 'node') {
    // Navigate to character detail
    if (characterStore.charactersInPhase.find(c => c.id === menu.value.id)) {
      characterStore.activeCharacterId = menu.value.id
      router.push({ name: 'Characters' })
    }
  }
  menu.value.visible = false
}

const handleDelete = async () => {
  const type = menu.value.type
  const id = menu.value.id
  menu.value.visible = false

  if (type === 'edge') {
    const confirmed = await uiStore.showConfirm({
      title: '删除关系',
      message: '确定要断绝这段关系吗？',
      confirmText: '断绝',
      type: 'warning'
    })
    if (confirmed) {
      characterStore.removeRelationship(id)
      removeEdges([id])
    }
  } else if (type === 'node') {
    // Usually deleting a node from graph deletes the character?
    // User might just want to hide it, but let's assume delete.
    const charName = menu.value.data?.character?.name || '未知角色'
    const confirmed = await uiStore.showConfirm({
      title: '删除角色',
      message: `确定要删除角色 "${charName}" 吗？此操作不可逆。`,
      confirmText: '删除角色',
      type: 'danger'
    })
    if (confirmed) {
      characterStore.removeCharacter(id)
      // refreshGraph will happen automatically due to watch
    }
  }
}

const saveRelationship = (updates: any) => {
  if (editingRelationship.value) {
    characterStore.smartUpdateRelationship(editingRelationship.value.id, updates)
    // Force graph update for label change
    refreshGraph()
  }
}

// 节点拖拽结束保存位置
const onNodeDragStop: NodeDragHandler = (event) => {
  // Single node drag
  if (event.node) {
    characterStore.updateCharacterPosition(
      event.node.id,
      event.node.position.x,
      event.node.position.y
    )
  }

  // Multi-selection drag
  if (event.nodes && event.nodes.length > 0) {
    event.nodes.forEach(node => {
      characterStore.updateCharacterPosition(
        node.id,
        node.position.x,
        node.position.y
      )
    })
  }
}

const nodesCount = computed(() => elements.value.filter(e => !e.source).length)
const edgesCount = computed(() => elements.value.filter(e => e.source).length)

// 简单的布局计算 (Grid Layout)
const getPosition = (char: any, index: number) => {
  // 优先使用已保存的 meta 坐标
  const layout = characterStore.graphLayout[char.id]
  if (layout?.x !== undefined && layout?.y !== undefined) {
    return { x: layout.x, y: layout.y }
  }

  // 对于新节点，使用网格布局默认位置
  const GRID_SIZE = 250
  const COLS = Math.ceil(Math.sqrt(characters.value.length)) || 1
  const row = Math.floor(index / COLS)
  const col = index % COLS
  return { x: col * GRID_SIZE + 50, y: row * GRID_SIZE + 50 }
}

const layoutNodes = () => {
  return characters.value.map((char, index) => {
    return {
      id: char.id,
      type: 'character',
      label: char.name, // 使用扁平化后的属性 (charactersInPhase 已展开 base)
      position: getPosition(char, index),
      data: { character: char },
    }
  })
}

// 辅助函数：获取两个节点之间关系的唯一签名（无向）
const getEdgeSignature = (source: string, target: string) => {
  return [source, target].sort().join('-')
}

// 转换关系为 Edge
const mapEdges = () => {
  // 防止连线重叠，对同一对节点之间的关系进行分组
  const edgeGroups: Record<string, number> = {}
  const currentOffsets: Record<string, number> = {}

  // 统计平行边数量
  relationships.value.forEach(rel => {
    const sig = getEdgeSignature(rel.sourceId, rel.targetId)
    edgeGroups[sig] = (edgeGroups[sig] || 0) + 1
  })

  return relationships.value.map(rel => {
    const sig = getEdgeSignature(rel.sourceId, rel.targetId)
    const total = edgeGroups[sig]
    const index = (currentOffsets[sig] || 0)
    currentOffsets[sig] = index + 1

    // 计算平行边的贝塞尔曲线偏移量
    let offset = 0
    if (total > 1) {
      const spacing = 60
      const centered = index - (total - 1) / 2
      offset = centered * spacing

      // 反转特定方向的偏移以视觉分离
      if (rel.sourceId > rel.targetId) {
        offset = -offset
      }
    }

    return {
      id: rel.id,
      source: rel.sourceId,
      target: rel.targetId,
      label: rel.label || rel.type,
      type: 'custom',
      animated: false,
      data: { relationship: rel, offset: offset },
      markerEnd: { type: 'arrowclosed', color: '#b1b1b7' },
      style: { stroke: 'var(--vf-edge-stroke, #b1b1b7)', strokeWidth: 2 }
    }
  })
}

// 刷新图谱数据
const refreshGraph = () => {
  const newNodes = layoutNodes()
  const newEdges = mapEdges()

  // 更新元素，Vue Flow 会自动处理差异，但完全替换能更好保证数据同步
  elements.value = [...newNodes, ...newEdges]
}

// 监听数据变化以更新图表
watch([characters, relationships, () => characterStore.graphLayout, () => characterStore.currentPhaseId], () => {
  refreshGraph()
}, { deep: true })

// 建立新连接
const onConnect = (params: Connection) => {
  if (params.source === params.target) return

  // 添加到 Store，监听器会自动刷新图表
  characterStore.addRelationship(params.source, params.target, 'custom')
}

// 自动布局 (D3 Force)
const runForceLayout = () => {
  const nodes = characters.value.map(c => {
    const layout = characterStore.graphLayout[c.id]
    return {
      id: c.id,
      x: layout?.x ?? Math.random() * 500,
      y: layout?.y ?? Math.random() * 500
    }
  })

  const links = relationships.value.map(r => ({
    source: r.sourceId,
    target: r.targetId
  }))

  const simulation = forceSimulation(nodes as any)
    .force('link', forceLink(links).id((d: any) => d.id).distance(300))
    .force('charge', forceManyBody().strength(-1000))
    .force('x', forceX(0).strength(0.1))
    .force('y', forceY(0).strength(0.1))
    .force('collide', forceCollide(150))
    .stop()

  // 本地运行模拟
  simulation.tick(300)

  // 同步回 Store
  nodes.forEach(node => {
    characterStore.updateCharacterPosition(node.id, node.x, node.y)
  })
}

onMounted(() => {
  refreshGraph()
})

</script>

<style>
.vue-flow__node-character {
  @apply !border-none !bg-transparent !p-0 !shadow-none;
}

.menu-enter-active {
  animation: fade-in 0.1s ease-out;
}

html.dark .vue-flow__edge-textbg {
  fill: #1e1e1e;
}

html.dark .vue-flow__edge-text {
  fill: #e5e5e5;
}
</style>