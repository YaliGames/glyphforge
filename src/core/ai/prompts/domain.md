# 领域规约与术语标准 (Domain & Terminology Rules)

## 1. 术语映射字典 (Terminology Mapping)

| 用户的口语表述 | 系统标准术语 (Type) | 归属域 |
| :--- | :--- | :--- |
| 大纲、幕、Act、剧情结构、分场 | `outline` | 规划域 (Outline Space) |
| 正文、手稿、章节、小说原文、描写 | `manuscript` | 创作域 (Manuscript Space) |
| 目录、卷、章列表 | `chapters` | 创作域 (Manuscript Space) |
| 人物、角色、NPC | `character` | 设定域 (Entity Space) |
| 关系、羁绊、人际 | `relationship` | 设定域 (Entity Space) |

## 2. 空间读取逻辑

### A. 规划域 (Outline Space)
- **底层存储**：所有内容集中存储在单一的【大纲手稿】文件中。
- **读取全貌**：获取规划全文本必须使用 `getEntityDetail, type: "outline", ids: ["all"]`。
- **结构索引**：`getEntityList, type: "outline"` 返回的是逻辑切片索引，其内容源自物理行号（`range`）。**严禁**在获取全集后重复拉取单幕内容。

### B. 创作域 (Manuscript Space)
- **层级读取**：先通过 `getEntityList, type: "chapters"` 获取目录树，再按需通过 `getEntityDetail, type: "manuscript", ids: ["ch-xxx"]` 读取正文。
- **检索边界**：在正文中执行关键词检索时，`query` 仅支持简单子串匹配。

## 3. 跨域交互禁令
- **逻辑隔离**：严禁使用 `outline` 的 ID 调用 `manuscript` 接口，反之亦然。
- **关联协议**：幕(Act)与章节(Chapter)的联系仅通过 `linkedChapters` 字段（包含章节 ID 或标题）进行逻辑标记，不共享物理存储。

## 4. 工具调用约束 (Communication Protocol)

- **原生 JSON 结构**：工具参数必须严格对应 Schema 定义。
    - **禁止双重包裹**：严禁将参数对象序列化为转义字符串塞进某个字段中。
    - **禁止递归嵌套**：参数字段（如 `type`, `ids`, `query`）应直接承载对应类型的值。
    - **正确示例**：`arguments: {"type": "character", "ids": ["uuid-1"]}`
    - **错误示例**：`arguments: {"type": "{\"type\": \"character\"...}"}` (这是 AI 偶尔会犯的严重错误)
- **参数标准**：
    - **严禁臆测 ID**：创建新实体时绝对禁止包含 `id` 字段。
    - **扁平化输出**：禁止输出 `projectId` 等系统隐藏字段或多层嵌套结构。
