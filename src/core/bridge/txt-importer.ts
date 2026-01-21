import chardet from 'chardet'

/**
 * TXT 导入器：处理 TXT 文件的读取与预处理
 */
export class TxtImporter {
  /**
   * 读取文件内容并探测编码
   */
  static async readFile(file: File): Promise<{ text: string; encoding: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer
        if (!buffer) {
          reject(new Error('读取文件失败'))
          return
        }

        const uint8 = new Uint8Array(buffer)
        const { text, encoding } = this.decodeBuffer(uint8)
        resolve({ text, encoding })
      }

      reader.onerror = () => reject(new Error('文件读取出错'))
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * 从 Buffer 解码并探测编码
   */
  static decodeBuffer(uint8: Uint8Array): { text: string; encoding: string } {
    // 1. 优先检查 BOM (Byte Order Mark)
    if (uint8[0] === 0xEF && uint8[1] === 0xBB && uint8[2] === 0xBF) {
      return { text: new TextDecoder('utf-8').decode(uint8), encoding: 'utf-8' }
    }
    if (uint8[0] === 0xFF && uint8[1] === 0xFE) {
      return { text: new TextDecoder('utf-16le').decode(uint8), encoding: 'utf-16le' }
    }
    if (uint8[0] === 0xFE && uint8[1] === 0xFF) {
      return { text: new TextDecoder('utf-16be').decode(uint8), encoding: 'utf-16be' }
    }

    // 2. 使用 chardet 进行统计学探测
    const detected = chardet.detect(uint8)
    let encoding = detected ? detected.toLowerCase() : 'utf-8'

    // 3. 编码名称标准化
    if (encoding.includes('gbk') || encoding.includes('gb18030') || encoding.includes('gb2312')) {
      encoding = 'gbk'
    } else if (encoding.includes('utf-8')) {
      encoding = 'utf-8'
    } else if (encoding.includes('utf-16le')) {
      encoding = 'utf-16le'
    } else if (encoding.includes('utf-16be')) {
      encoding = 'utf-16be'
    }

    // 4. 尝试解码
    try {
      // 如果探测结果是 utf-8，先尝试严格模式
      if (encoding === 'utf-8') {
        const strictDecoder = new TextDecoder('utf-8', { fatal: true })
        return { text: strictDecoder.decode(uint8), encoding: 'utf-8' }
      }
      
      const decoder = new TextDecoder(encoding)
      return { text: decoder.decode(uint8), encoding }
    } catch (e) {
      // 如果失败，最后的回退方案：尝试 GBK (中文环境最常见) 否则强制 UTF-8
      try {
        const fallbackDecoder = new TextDecoder('gbk')
        return { text: fallbackDecoder.decode(uint8), encoding: 'gbk' }
      } catch (e2) {
        const finalDecoder = new TextDecoder('utf-8')
        return { text: finalDecoder.decode(uint8), encoding: 'utf-8' }
      }
    }
  }

  /**
   * 预处理文本：统一换行符，去除首尾空白
   */
  static preprocess(text: string): string {
    // 统一换行符为 LF
    let processed = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    // 去除首尾空白行
    processed = processed.trim()
    return processed
  }
}
