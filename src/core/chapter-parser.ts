import type { ChapterNode, ChapterType, RecognitionRules } from '@/types'

/**
 * 章节解析器：基于正则管线识别章节结构
 */
export class ChapterParser {
  // 预定义的正则模式
  private static PATTERNS = {
    // 章级标题
    CHAPTER: [
      /^第\s*(\d+|[一二三四五六七八九十百千万零〇]+)\s*[章回节]/,
      /^(\d+|[一二三四五六七八九十百千万零〇]+)\s*[章回节]/,
      /^Chapter\s*\d+/i,
      /^\d+\s*[\.、\s]/, // 1. 标题 或 1 标题
      /^【\s*第?\s*(\d+|[一二三四五六七八九十百千万零〇]+)\s*[章回节]\s*】/
    ],
    // 卷/部级标题
    VOLUME: [
      /^第\s*(\d+|[一二三四五六七八九十百千万]+)\s*[卷部]/,
      /^[卷部]\s*(\d+|[一二三四五六七八九十百千万]+)/,
      /^Volume\s*\d+/i,
      /^正文$/
    ],
    // 特殊章节
    SPECIAL: [
      /^(番外|外传|后日谈|IF线|平行世界|前言|序言|自序|后记|跋|感言|小剧场|特别篇|特典)/,
      /^[·:：\s]?(番外|外传|后日谈|IF线|平行世界|小剧场|特别篇|特典)[·:：\s]?.+/
    ]
  }

  /**
   * 解析行数组并生成章节树
   */
  static parse(lines: string[]): ChapterNode[] {
    const chapters = this.detectChapters(lines)
    return this.buildTree(chapters, lines.length)
  }

  /**
   * 识别所有章节行（扁平结构）
   */
  public static detectChapters(lines: string[], rules?: RecognitionRules): ChapterNode[] {
    const chapters: ChapterNode[] = []
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      if (!trimmedLine) return

      // 第一层：结构锚定 (Structural Anchors)
      if (!this.isCandidate(trimmedLine, lines, index, rules?.structuralAnchors)) return

      // 第三层：否定规则 (Negative Rules) - 提前排除
      if (this.isNegative(trimmedLine, rules?.negativeRules)) return

      // 第二层：模式匹配 (Pattern Matching)
      const match = this.matchPattern(trimmedLine, rules?.patterns)
      if (match) {
        chapters.push(this.createChapterNode(trimmedLine, index, match.type))
      }
    })

    return chapters
  }

  /**
   * 创建章节节点对象
   */
  public static createChapterNode(title: string, lineIndex: number, type: ChapterType): ChapterNode {
    return {
      id: `ch-${lineIndex}`,
      title: title,
      originalTitle: title,
      type: type,
      startLine: lineIndex,
      endLine: lineIndex,
      level: this.getTypeLevel(type),
      children: []
    }
  }

  /**
   * 将扁平列表构建为树结构
   */
  public static buildTree(flatChapters: ChapterNode[], totalLines: number): ChapterNode[] {
    // 先按行号排序
    const sortedChapters = [...flatChapters].sort((a, b) => a.startLine - b.startLine)

    // 计算每个章节的结束行
    for (let i = 0; i < sortedChapters.length; i++) {
      const nextChapter = sortedChapters[i + 1]
      sortedChapters[i].endLine = nextChapter ? nextChapter.startLine - 1 : totalLines - 1
    }

    const root: ChapterNode[] = []
    const stack: ChapterNode[] = []

    // 深拷贝节点以构建树，避免修改原始扁平列表
    const nodes = sortedChapters.map(node => ({ ...node, children: [] }))

    nodes.forEach(node => {
      while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
        stack.pop()
      }

      if (stack.length === 0) {
        root.push(node)
      } else {
        stack[stack.length - 1].children.push(node)
      }
      stack.push(node)
    })

    return root
  }

  /**
   * 判断是否为候选行
   */
  private static isCandidate(line: string, lines: string[], index: number, config?: RecognitionRules['structuralAnchors']): boolean {
    // 第一层：结构锚定 (Structural Anchors)
    const maxLength = config?.maxLength ?? 40
    const requireEmptyLine = config?.requireEmptyLineAround ?? true
    
    // 1. 去除首尾空白后，整行长度限制
    if (line.length > maxLength) return false
    
    // 2. 位于文件起始处
    if (index === 0) return true
    
    // 3. 前一行或后一行为全空行
    if (requireEmptyLine) {
      const prevLine = index > 0 ? lines[index - 1].trim() : ''
      const nextLine = index < lines.length - 1 ? lines[index + 1].trim() : ''
      return prevLine === '' || nextLine === ''
    }
    
    return true
  }

  /**
   * 否定规则：排除明显不是标题的行
   */
  private static isNegative(line: string, config?: RecognitionRules['negativeRules']): boolean {
    if (config?.enabled === false) return false

    // 行尾包含句号、问号、感叹号
    if (config?.excludePunctuationEnd !== false) {
      if (/[。？！?!]$/.test(line) && !/^(感言|后记|跋)$/.test(line)) return true
    }
    
    // 标点符号过多
    if (config?.maxPunctuationCount !== undefined) {
      const punctuationCount = (line.match(/[，。？！，、；：""''（）【】]/g) || []).length
      if (punctuationCount >= config.maxPunctuationCount) return true
    }
    
    // 行首为引号或括号
    if (config?.excludeDialogueStart !== false) {
      if (/^[“"（(]/.test(line)) return true
    }
    
    // 包含明显的正文特征词
    if (/(说道|回答|点点头|摇摇头|笑了笑)/.test(line)) return true

    return false
  }

  /**
   * 模式匹配：识别章节类型
   */
  private static matchPattern(line: string, customPatterns?: RecognitionRules['patterns']): { type: ChapterType } | null {
    if (customPatterns) {
      // 如果有自定义模式，则动态编译
      for (const p of customPatterns.volume) {
        if (new RegExp(p, 'i').test(line)) return { type: 'volume' }
      }
      for (const p of customPatterns.chapter) {
        if (new RegExp(p, 'i').test(line)) return { type: 'chapter' }
      }
      for (const p of customPatterns.special) {
        if (new RegExp(p, 'i').test(line)) return { type: 'special' }
      }
    } else {
      // 使用预定义的静态正则对象，避免重复创建 RegExp 对象提升性能
      for (const regex of this.PRECOMPILED_PATTERNS.volume) {
        if (regex.test(line)) return { type: 'volume' }
      }
      for (const regex of this.PRECOMPILED_PATTERNS.chapter) {
        if (regex.test(line)) return { type: 'chapter' }
      }
      for (const regex of this.PRECOMPILED_PATTERNS.special) {
        if (regex.test(line)) return { type: 'special' }
      }
    }

    return null
  }

  // 预编译静态正则
  private static PRECOMPILED_PATTERNS = {
    volume: this.PATTERNS.VOLUME.map(r => new RegExp(r.source, 'i')),
    chapter: this.PATTERNS.CHAPTER.map(r => new RegExp(r.source, 'i')),
    special: this.PATTERNS.SPECIAL.map(r => new RegExp(r.source, 'i'))
  }

  /**
   * 获取章节类型的层级深度
   */
  public static getTypeLevel(type: ChapterType): number {
    switch (type) {
      case 'volume': return 1
      case 'chapter': return 2
      case 'special': return 3
      default: return 4
    }
  }
}
