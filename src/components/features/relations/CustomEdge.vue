<script setup lang="ts">
import { computed, inject } from 'vue'
import { EdgeProps, EdgeLabelRenderer, BaseEdge } from '@vue-flow/core'

const props = defineProps<EdgeProps>()

const triggerEdgeAction = inject<(event: MouseEvent, id: string) => void>('triggerEdgeAction')

const onLabelClick = (event: MouseEvent) => {
  event.stopPropagation()
  if (triggerEdgeAction) {
    triggerEdgeAction(event, props.id)
  }
}

const pathData = computed(() => {
  const { sourceX, sourceY, targetX, targetY, data } = props

  // 节点半径
  const r = 36

  // 计算向量和各分量
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const len = Math.sqrt(dx * dx + dy * dy) || 1

  // 计算圆周切点 (从边缘开始绘制连线)
  let sx = sourceX
  let sy = sourceY
  let tx = targetX
  let ty = targetY

  // 避免节点重叠时连线混乱
  if (len > r * 2) {
    const ux = dx / len
    const uy = dy / len
    sx = sourceX + ux * r
    sy = sourceY + uy * r - 12
    tx = targetX - ux * r
    ty = targetY - uy * r - 12
  }

  // 中点计算
  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2
  const offset = data?.offset || 0

  let path = ''
  let labelX = midX
  let labelY = midY

  if (Math.abs(offset) > 1) {
    // 多重边: 贝塞尔曲线
    const nx = -dy / len
    const ny = dx / len
    const cx = midX + nx * offset
    const cy = midY + ny * offset
    path = `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`
    labelX = 0.25 * sx + 0.5 * cx + 0.25 * tx
    labelY = 0.25 * sy + 0.5 * cy + 0.25 * ty
  } else {
    // 单边: 直线
    path = `M ${sx} ${sy} L ${tx} ${ty}`
    labelX = (sx + tx) / 2
    labelY = (sy + ty) / 2
  }

  return { path, labelX, labelY }
})
</script>

<template>
  <BaseEdge :path="pathData.path" :style="style" :marker-end="markerEnd" />

  <EdgeLabelRenderer>
    <div :style="{
      position: 'absolute',
      transform: `translate(-50%, -50%) translate(${pathData.labelX}px,${pathData.labelY}px)`,
      pointerEvents: 'all',
    }" class="nodrag nopan" @click="onLabelClick">
      <div
        class="px-3 py-1 bg-app-surface/80 backdrop-blur-md border border-divider rounded-full shadow-sm text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap cursor-pointer transition-all duration-200 hover:scale-110 hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-md active:scale-95">
        {{ label }}
      </div>
    </div>
  </EdgeLabelRenderer>
</template>
