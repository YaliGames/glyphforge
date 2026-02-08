import type { AITool } from '@/types/ai';

/**
 * 工具执行上下文
 * 封装了工具执行时所需的所有 Store 和服务
 */
export interface ToolContext {
  projectStore: any;
  characterStore: any;
  outlineStore: any;
  worldviewStore: any;
  uiStore: any;
}

/**
 * 解耦后的 AI 工具接口
 * 结合了 OpenAI 的 Schema 定义与具体的执行逻辑
 */
export interface DecoupledTool extends AITool {
  /**
   * 工具执行逻辑
   * @param args AI 传入的参数
   * @param context 执行上下文
   */
  execute(args: any, context: ToolContext): Promise<any>;
  
  /**
   * 是否为只读工具
   * 只读工具可以直接执行，写入工具通常需要 UI 确认
   */
  isReadOnly: boolean;
}

/**
 * 工具注册表
 */
const registry: Map<string, DecoupledTool> = new Map();

export function registerTool(tool: DecoupledTool) {
  registry.set(tool.name, tool);
}

export function getTool(name: string): DecoupledTool | undefined {
  return registry.get(name);
}

export function getAllTools(): DecoupledTool[] {
  return Array.from(registry.values());
}

export function getReadOnlyToolNames(): string[] {
  return getAllTools()
    .filter(t => t.isReadOnly)
    .map(t => t.name);
}

import { getEntityListTool } from './read/getEntityList';
import { getEntityDetailTool } from './read/getEntityDetail';
import { getEntitySchemaTool } from './read/getEntitySchema';
import { searchEntitiesTool } from './read/searchEntities';
import { getRelationGraphTool } from './read/getRelationGraph';

import { upsertEntitiesTool } from './write/upsertEntities';
import { editTextBlockTool } from './write/editTextBlock';
import { deleteEntitiesTool } from './write/deleteEntities';

registerTool(getEntityListTool);
registerTool(getEntityDetailTool);
registerTool(getEntitySchemaTool);
registerTool(searchEntitiesTool);
registerTool(getRelationGraphTool);

registerTool(upsertEntitiesTool);
registerTool(editTextBlockTool);
registerTool(deleteEntitiesTool);

/**
 * 预定义 AI 工具集 (Function Calling)
 * 此处通过聚合注册中心中的解耦工具实现，为 AI 引擎提供标准接口定义。
 */
export const AI_TOOLS: AITool[] = getAllTools().map(tool => ({
  name: tool.name,
  description: tool.description,
  parameters: tool.parameters
}));

/**
 * 只读型工具列表
 * 动态从工具注册表中获取标记为 isReadOnly: true 的工具
 */
export const READ_ONLY_TOOLS = getReadOnlyToolNames();
