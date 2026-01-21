import type { AppAction } from '@/types'

/**
 * 从键盘事件中识别指令
 */
export function getActionFromKey(e: KeyboardEvent): AppAction | null {
  const isCtrl = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();
  const shift = e.shiftKey;

  // Ctrl 组合键
  if (isCtrl) {
    switch (key) {
      case 'n': return 'new-project';
      case 'o': return 'open-project';
      case 's': return shift ? 'save-as' : 'save';
      case 'z': return shift ? 'redo' : 'undo';
      case 'y': return 'redo';
      case 'f': return 'find';
      case 'h': return 'replace';
      case '1': return 'goto-outline';
      case '2': return 'goto-editor';
      case '3': return 'goto-characters';
      case '4': return 'goto-worldview';
      case '5': return 'goto-timeline';
      case ',': return 'settings';
    }
  }

  return null;
}
