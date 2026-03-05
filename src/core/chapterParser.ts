import type { ChapterNode, RecognitionRules } from '@/types'

/**
 * 章节解析器：基于正则管线识别章节结构
 */
export class ChapterParser {
  private static DEFAULT_PATTERNS = {
    hierarchies: {
      0: [
        /^第\s*(\d+|[一二三四五六七八九十百千万]+)\s*[卷部]/,
        /^[卷部]\s*(\d+|[一二三四五六七八九十百千万]+)/,
        /^Volume\s*\d+/i,
        /^正文$/
      ],
      1: [
        /^第\s*(\d+|[一二三四五六七八九十百千万零〇]+)\s*[章回节]/,
        /^(\d+|[一二三四五六七八九十百千万零〇]+)\s*[章回节]/,
        /^Chapter\s*\d+/i,
        /^\d+\s*[\.、\s]/,
        /^【\s*第?\s*(\d+|[一二三四五六七八九十百千万零〇]+)\s*[章回节]\s*】/
      ],
      2: [
        /^(番外|外传|后日谈|IF线|平行世界|前言|序言|自序|后记|跋|感言|小剧场|特别篇|特典)/,
        /^[·:：\s]?(番外|外传|后日谈|IF线|平行世界|小剧场|特别篇|特典)[·:：\s]?.+/
      ]
    }
  }

  /**
   * 解析行数组并生成章节树
   */
  static parse(lines: string[], validDepths?: number[]): ChapterNode[] {
    const chapters = this.detectChapters(lines, undefined, validDepths)
    return this.buildTree(chapters, lines.length)
  }

  /**
   * 识别所有章节行（扁平结构）
   */
  public static detectChapters(lines: string[], rules?: RecognitionRules, validDepths?: number[]): ChapterNode[] {
    const chapters: ChapterNode[] = []
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      if (!trimmedLine) return

      // 第一层：结构锚定 (Structural Anchors)
      if (!this.isCandidate(trimmedLine, lines, index, rules?.structuralAnchors)) return

      // 第三层：否定规则 (Negative Rules) - 提前排除
      if (this.isNegative(trimmedLine, rules?.negativeRules)) return

      // 第二层：模式匹配 (Pattern Matching)
      const match = this.matchPattern(trimmedLine, rules?.patterns, validDepths)
      if (match) {
        chapters.push(this.createChapterNode(trimmedLine, index, match.depth))
      }
    })

    return chapters
  }

  /**
   * 创建章节节点对象
   */
  public static createChapterNode(title: string, lineIndex: number, depth: number): ChapterNode {
    return {
      id: `ch-${lineIndex}`,
      title: title,
      originalTitle: title,
      depth: depth,
      startLine: lineIndex,
      endLine: lineIndex,
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
      while (stack.length > 0 && stack[stack.length - 1].depth >= node.depth) {
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
    const maxLength = config?.maxLength ?? 40
    const requireEmptyLineAround = config?.requireEmptyLineAround ?? true
    
    if (line.length > maxLength) return false
    
    if (index === 0) return true
    
    if (requireEmptyLineAround) {
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

    if (config?.excludePunctuationEnd !== false) {
      if (/[。？！?!]$/.test(line) && !/^(感言|后记|跋)$/.test(line)) return true
    }

    if (config?.maxPunctuationCount !== undefined) {
      const punctuationCount = (line.match(/[，。？！，、；：""''（）【】]/g) || []).length
      if (punctuationCount >= config.maxPunctuationCount) return true
    }
    
    if (config?.excludeDialogueStart !== false) {
      if (/^[“"（(]/.test(line)) return true
    }

    return false
  }

  /**
   * 模式匹配：识别章节层级
   */
  private static matchPattern(
    line: string, 
    customPatterns?: RecognitionRules['patterns'], 
    validDepths?: number[]
  ): { depth: number } | null {
    if (customPatterns) {
      const depths = Object.keys(customPatterns.hierarchies)
        .map(Number)
        .filter(d => !validDepths || validDepths.includes(d))
        .sort((a, b) => a - b)
      
      for (const depth of depths) {
        for (const p of customPatterns.hierarchies[depth]) {
          try {
            if (new RegExp(p, 'i').test(line)) {
              return { depth: depth }
            }
          } catch (e) {
            console.error(`Invalid regex pattern: ${p}`, e)
          }
        }
      }
    } else {
      // 默认解析
      const defaultDepths = Object.keys(this.DEFAULT_PATTERNS.hierarchies)
        .map(Number)
        .filter(d => !validDepths || validDepths.includes(d))
        .sort((a, b) => a - b)

      for (const depth of defaultDepths) {
        const list = (this.DEFAULT_PATTERNS.hierarchies as any)[depth]
        for (const regex of list) {
          if (regex.test(line)) {
            return { depth: depth }
          }
        }
      }
    }

    return null
  }
}
