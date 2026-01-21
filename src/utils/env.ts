export const isElectron = typeof window !== 'undefined' && 
  (window as any).process !== undefined && 
  ((window as any).process as any).type === 'renderer' || 
  (window as any).electronAPI !== undefined;

export const isWeb = !isElectron;

export const platform = isElectron ? (window as any).electronAPI?.platform || 'electron' : 'web';
