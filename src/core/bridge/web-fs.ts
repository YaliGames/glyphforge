import { IFileSystem, FileFilter } from './index';
import { TxtImporter } from './txt-importer';

export class WebFileSystem implements IFileSystem {
  async readFile(options?: string | { path?: string, filters?: FileFilter[] }): Promise<{ content: string, name: string, path?: string }> {
    const filters = typeof options === 'object' ? options.filters : undefined;

    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      
      if (filters && filters.length > 0) {
        const accept = filters.flatMap(f => f.extensions.map(ext => `.${ext}`)).join(',');
        input.accept = accept;
      } else {
        input.accept = '.txt,.md,.gfp';
      }
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('未选择文件'));
          return;
        }
        
        try {
          const { text } = await TxtImporter.readFile(file);
          resolve({
            content: text,
            name: file.name
          });
        } catch (err) {
          reject(err);
        }
      };
      
      input.click();
    });
  }

  async writeFile(): Promise<void> {
    // Web 端不支持直接写入文件，通常通过 saveAs 触发下载
    throw new Error('Web 端不支持直接写入文件，请使用 saveAs');
  }

  async saveAs(content: string, defaultName: string): Promise<string | null> {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = defaultName;
    link.click();
    URL.revokeObjectURL(url);
    return defaultName;
  }
}
