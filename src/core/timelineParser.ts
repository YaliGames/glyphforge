import type { WorldTimelineEvent } from '@/types'

export interface RawTimelineEvent {
  timeLabel: string
  title: string
  description: string
}

export interface TemplatePattern {
  template: string
  placeholders: ('时间' | '标题' | '内容')[]
  regex: RegExp
}

/**
 * 时间轴解析器：将非结构化文本转化为结构化时间线事件
 */
export class TimelineParser {
  /**
   * 根据用户输入的模板字符串生成解析器
   * @param template 模板字符串，如 "{时间}：{标题} | {内容}"
   * @returns TemplatePattern 对象
   */
  static createTemplatePattern(template: string): TemplatePattern {
    const placeholders: ('时间' | '标题' | '内容')[] = []
    let regexString = ''
    let lastIndex = 0
    
    const placeholderRegex = /\{(时间|标题|内容)\}/g
    let match

    while ((match = placeholderRegex.exec(template)) !== null) {
      const placeholder = match[1] as '时间' | '标题' | '内容'
      
      const literal = template.substring(lastIndex, match.index)
      regexString += this.escapeRegex(literal)
      
      regexString += '(.*?)'
      placeholders.push(placeholder)
      
      lastIndex = match.index + match[0].length
    }

    const remaining = template.substring(lastIndex)
    regexString += this.escapeRegex(remaining)

    if (placeholders.length === 0) {
      throw new Error('模板必须包含至少一个占位符：{时间}、{标题} 或 {内容}')
    }

    const regex = new RegExp(`^${regexString}$`, 'm')

    return { template, placeholders, regex }
  }

  /**
   * 转义正则表达式中的特殊字符
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * 使用自定义模板解析文本
   */
  static parseWithCustomTemplate(text: string, pattern: TemplatePattern): RawTimelineEvent[] {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '')

    return lines.map(rawLine => {
      const line = rawLine.trim()
      const match = line.match(pattern.regex)

      if (match && match.length > pattern.placeholders.length) {
        const result: RawTimelineEvent = {
          timeLabel: '',
          title: '',
          description: ''
        }

        // 根据占位符顺序填充数据
        pattern.placeholders.forEach((placeholder, idx) => {
          const value = match[idx + 1]?.trim() || ''
          
          switch (placeholder) {
            case '时间':
              result.timeLabel = value
              break
            case '标题':
              result.title = value
              break
            case '内容':
              result.description = value
              break
          }
        })

        if (!result.title) {
          result.title = '未命名事件'
        }

        return result
      }

      return {
        timeLabel: '',
        title: line,
        description: ''
      }
    })
  }

  /**
   * 转换为最终存储实体 (由 Store 进一步处理)
   */
  static finalize(raw: RawTimelineEvent): Partial<WorldTimelineEvent> {
    return {
      title: raw.title,
      description: raw.description,
      time: {
        label: raw.timeLabel,
        order: 0 // 实际由 Store 在插入时覆盖
      }
    }
  }
}
