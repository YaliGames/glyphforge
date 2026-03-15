import type { ComputedRef, Ref } from 'vue'
import type { AIReference } from '@/types'
import type { useAIStore } from '@/store/ai'

interface UseAIPromptComposerOptions {
  aiStore: ReturnType<typeof useAIStore>
  activeReferences: ComputedRef<AIReference[]>
  selectedPromptId: Ref<string>
  referenceTypeLabelMap: ComputedRef<Record<string, string>>
}

export function useAIPromptComposer(options: UseAIPromptComposerOptions) {
  const { aiStore, activeReferences, selectedPromptId, referenceTypeLabelMap } = options

  function composePrompt(userContent: string): string {
    let fullPrompt = userContent

    const refLines = activeReferences.value.map(reference => {
      const typeLabel = referenceTypeLabelMap.value[reference.type] || reference.type

      if (reference.id === 'all') {
        const children = aiStore.getContextOptions(reference.type)
        const childList = children.map((item: any) => `${item.label}(ID:${item.id})`).join('、')
        return `- [@${reference.label}] (类型:${typeLabel}, ID:all, 包含子项: ${childList || '空'})`
      }

      return `- [@${reference.label}] (类型:${typeLabel}, ID:${reference.id})`
    })

    if (refLines.length > 0) {
      const refLinesText = refLines.join('\n')
      const refNotice = '(提示：索引仅包含 ID 和名称。若需分析具体内容，请务必通过调用工具获取详情)'
      const refSection = `### 本次对话引用的实体索引 ###\n${refLinesText}\n${refNotice}\n`

      const promptTemplate = selectedPromptId.value
        ? aiStore.allPrompts.find(item => item.id === selectedPromptId.value)?.content
        : null

      if (!promptTemplate || !promptTemplate.includes('[REFERENCES]')) {
        fullPrompt = refSection + '\n' + fullPrompt
      }
    }

    if (selectedPromptId.value) {
      const prompt = aiStore.allPrompts.find(item => item.id === selectedPromptId.value)
      if (prompt) {
        let templatedPrompt = prompt.content

        if (templatedPrompt.includes('[REFERENCES]')) {
          const refContent = refLines.length > 0
            ? refLines.join('\n')
            : '（本次对话中，用户未显式引用特定实体）'
          templatedPrompt = templatedPrompt.replace('[REFERENCES]', refContent)
        }

        fullPrompt = templatedPrompt.replace('[USER_INPUT]', fullPrompt)
      }
    }

    return fullPrompt
  }

  return {
    composePrompt
  }
}
