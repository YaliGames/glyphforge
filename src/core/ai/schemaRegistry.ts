/**
 * AI 实体 Schema 注册表
 * 
 * 统一管理项目中各类实体（角色、世界观、大纲、关系等）的字段定义。
 * 作用：
 * 1. 自动生成工具调用的参数描述 (toolDefinitions)。
 * 2. 驱动 ContextEngine 进行数据清洗（导出给 AI 的数据过滤）。
 * 3. 驱动 upsert 逻辑对 AI 返回的数据进行合法性校验。
 */

export interface FieldDefinition {
  key: string;            // 程序内部字段名
  label: string;          // 中文友好名称
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;    // 字段功能简介 (用于提示 AI)
  aiExport: boolean;      // 是否在发送给 AI 的上下文中包含
  aiImport: boolean;      // 是否允许 AI 通过工具修改/返回此字段
  required?: boolean;     // 工具调用时是否必填 (仅对 aiImport 有效)
  isIdentity?: boolean;   // 是否是唯一标识符 (ID)
  isTechnical?: boolean;  // 是否是技术性字段 (如 projectId, order)
}

export interface EntitySchema {
  type: string;           // 实体类型 Key (如 character)
  label: string;          // 实体类型名称 (如 角色)
  description: string;    // 这种实体的用途描述 (用于提示 AI)
  fields: FieldDefinition[];
}

export const SCHEMA_REGISTRY: Record<string, EntitySchema> = {
  character: {
    type: 'character',
    label: '角色',
    description: '用于存储小说中人物的形象、性格、背景等核心信息。建议在提到新角色或重大设定更新时使用。',
    fields: [
      { key: 'id', label: 'ID', type: 'string', description: '唯一标识', aiExport: true, aiImport: true, isIdentity: true },
      { key: 'name', label: '姓名', type: 'string', description: '角色姓名', aiExport: true, aiImport: true, required: true },
      { key: 'aliases', label: '别名', type: 'array', description: '角色昵称或别名', aiExport: true, aiImport: true },
      { key: 'gender', label: '性别', type: 'string', description: '角色性别', aiExport: true, aiImport: true },
      { key: 'age', label: '年龄', type: 'string', description: '角色年龄', aiExport: true, aiImport: true },
      { key: 'factions', label: '阵营', type: 'array', description: '角色所属的组织、流派或社会地位', aiExport: true, aiImport: true },
      { key: 'identities', label: '身份/头衔', type: 'array', description: '角色的具体职位、称号或社会标签', aiExport: true, aiImport: true },
      { key: 'positioning', label: '定位', type: 'string', description: '角色在故事中的定位，如主角、核心配角、对立角色等', aiExport: true, aiImport: true },
      { key: 'motivation', label: '动机目标', type: 'string', description: '角色的核心目标与行动理由', aiExport: true, aiImport: true },
      { key: 'appearance', label: '外貌', type: 'string', description: '角色的体貌特征、惯常穿着', aiExport: true, aiImport: true },
      { key: 'personality', label: '性格', type: 'string', description: '角色的核心性格、行事逻辑', aiExport: true, aiImport: true },
      { key: 'background', label: '背景', type: 'string', description: '角色的出身、过往经历、关键转折点', aiExport: true, aiImport: true },
      { key: 'tags', label: '标签', type: 'array', description: '检索关键词', aiExport: true, aiImport: true },
      { key: 'authorNotes', label: '作者备注', type: 'string', description: '额外补遗信息', aiExport: true, aiImport: true },
      { key: 'openQuestions', label: '待解决问题', type: 'string', description: '尚未确定的设定', aiExport: true, aiImport: true },
      { key: 'projectId', label: '项目ID', type: 'string', description: '内部引用', aiExport: false, aiImport: false, isTechnical: true },
      { key: 'type', label: '类型', type: 'string', description: '实体分类', aiExport: true, aiImport: false, isTechnical: true },
    ]
  },
  relationship: {
    type: 'relationship',
    label: '人物关系',
    description: '描述两个角色之间的社交关系、情感状态及冲突。',
    fields: [
      { key: 'id', label: 'ID', type: 'string', description: '唯一标识', aiExport: true, aiImport: true, isIdentity: true },
      { key: 'sourceId', label: '源角色ID', type: 'string', description: '发起方的 ID (必须从已存在角色中选择)', aiExport: true, aiImport: true, required: true },
      { key: 'targetId', label: '目标角色ID', type: 'string', description: '接收方的 ID (必须从已存在角色中选择)', aiExport: true, aiImport: true, required: true },
      { key: 'type', label: '关系类型', type: 'string', description: '分类标识 (如 enemy, friend)', aiExport: true, aiImport: true, required: true },
      { key: 'label', label: '关系描述', type: 'string', description: '文字标签 (如“生死之交”)', aiExport: true, aiImport: true },
      { key: 'strength', label: '关系强度', type: 'number', description: '紧密程度 (-100 到 100)', aiExport: true, aiImport: true },
      { key: 'direction', label: '方向', type: 'string', description: '方向 (directed/undirected/bidirectional)', aiExport: true, aiImport: true },
      { key: 'notes', label: '备注', type: 'string', description: '补充说明', aiExport: true, aiImport: true },
    ]
  },
  outline: {
    type: 'outline',
    label: '大纲幕',
    description: '小说情节的结构单元。AI 应根据当前情节分析自动更新对应幕的摘要。',
    fields: [
      { key: 'id', label: 'ID', type: 'string', description: '唯一标识', aiExport: true, aiImport: true, isIdentity: true },
      { key: 'title', label: '标题', type: 'string', description: '该幕标题', aiExport: true, aiImport: true, required: true },
      { key: 'purpose', label: '创作意图', type: 'string', description: '该幕的作用', aiExport: true, aiImport: true },
      { key: 'textSegments', label: '文本片段', type: 'array', description: '叙述内容 (只读)', aiExport: true, aiImport: false },
      { key: 'linkedChapters', label: '关联章节', type: 'array', description: '章节ID', aiExport: false, aiImport: false, isTechnical: true },
      { key: 'order', label: '排序', type: 'number', description: '排序权重', aiExport: false, aiImport: false, isTechnical: true },
    ]
  },
  worldview: {
    type: 'worldview',
    label: '世界观',
    description: '描述小说的宏观背景。包含地理、文明、法则等分类。',
    fields: [
      { key: 'type', label: '类别', type: 'string', description: '类别 ID (如 geography)', aiExport: true, aiImport: false, isIdentity: true },
      { key: 'name', label: '名称', type: 'string', description: '分类名称', aiExport: true, aiImport: true, required: true },
      { key: 'summary', label: '概述', type: 'string', description: '整体说明', aiExport: true, aiImport: true },
      { key: 'details', label: '设定点', type: 'array', description: '具体设定点列表 (字符串数组)', aiExport: true, aiImport: true }
    ]
  },
  chapters: {
    type: 'chapters',
    label: '目录',
    description: '小说的层级目录树（卷、章、节节点列表）。',
    fields: [
      { key: 'id', label: 'ID', type: 'string', description: '唯一标识', aiExport: true, aiImport: false, isIdentity: true },
      { key: 'title', label: '标题', type: 'string', description: '目录项标题', aiExport: true, aiImport: false },
      { key: 'type', label: '节点类型', type: 'string', description: '节点类型 (volume, chapter, scene)', aiExport: true, aiImport: false },
      { key: 'children', label: '子节点', type: 'array', description: '子级目录项', aiExport: true, aiImport: false },
    ]
  },
  manuscript: {
    type: 'manuscript',
    label: '正文',
    description: '作品的实时文本内容。',
    fields: [
      { key: 'id', label: 'ID', type: 'string', description: '关联的章节 ID', aiExport: true, aiImport: false, isIdentity: true },
      { key: 'title', label: '标题', type: 'string', description: '章节标题', aiExport: true, aiImport: false },
      { key: 'content', label: '文本内容', type: 'string', description: '该章节的完整原始文本', aiExport: true, aiImport: false }
    ]
  }
};

/**
 * 核心逻辑：为 AI 生成严格的指令指南
 * 这是一个动态生成的文档，告诉 AI 每个实体有哪些字段可以用。
 */
export function generateAISchemaManual(): string {
  let manual = "### 实体字段操作规范 (Strict Field Schema) ###\n\n";
  manual += "当你调用 upsertEntities 时，必须严格遵守以下字段定义。严禁拼写错误，严禁包含下方未列出的字段。\n\n";
  
  Object.values(SCHEMA_REGISTRY).forEach(entity => {
    manual += `#### [${entity.label} | 类型: ${entity.type}] ####\n`;
    manual += `* 定义: ${entity.description}\n`;
    manual += `* 字段白名单:\n`;
    
    entity.fields.forEach(f => {
      if (!f.aiImport) return;
      const req = f.required ? " (REQUIRED)" : "";
      manual += `  - ${f.key}: ${f.description}${req} [JSON类型: ${f.type}]\n`;
    });
    manual += "\n";
  });
  
  return manual;
}

/**
 * 辅助工具：根据 Schema 获取 AI 应该看到的字段
 */
export function getAIExportKeys(type: string): string[] {
  const schema = SCHEMA_REGISTRY[type];
  if (!schema) return [];
  return schema.fields.filter(f => f.aiExport).map(f => f.key);
}

/**
 * 辅助工具：获取所有标记为技术性的字段 (跨实体)
 */
export function getTechnicalKeys(): string[] {
  const keys = new Set<string>();
  Object.values(SCHEMA_REGISTRY).forEach(schema => {
    schema.fields.forEach(f => {
      if (f.isTechnical) keys.add(f.key);
    });
  });
  return Array.from(keys);
}

/**
 * 辅助工具：获取所有标记为身份的字段 (跨实体)
 */
export function getIdentityKeys(): string[] {
  const keys = new Set<string>();
  Object.values(SCHEMA_REGISTRY).forEach(schema => {
    schema.fields.forEach(f => {
      if (f.isIdentity) keys.add(f.key);
    });
  });
  return Array.from(keys);
}
