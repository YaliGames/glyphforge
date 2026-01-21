import { IFileSystem, FileFilter } from './index';
import { TxtImporter } from './txt-importer';

export class ElectronFileSystem implements IFileSystem {
  private get api() {
    return (window as any).electronAPI;
  }

  async readFile(options?: string | { path?: string, filters?: FileFilter[] }): Promise<{ content: string, name: string, path?: string }> {
    let path: string | undefined;
    let filters: FileFilter[] | undefined;

    if (typeof options === 'string') {
      path = options;
    } else if (typeof options === 'object') {
      path = options.path;
      filters = options.filters;
    }

    if (path) {
      const result = await this.api.readFile(path);
      const { text } = TxtImporter.decodeBuffer(result.data);
      return {
        content: text,
        name: result.name,
        path: result.path
      };
    }

    const result = await this.api.showOpenDialog({
      filters: filters || [
        { name: '支持的文件', extensions: ['txt', 'md', 'gfp'] },
        { name: '文本文件', extensions: ['txt', 'md'] },
        { name: 'GlyphForge工程文件', extensions: ['gfp'] }
      ]
    });
    if (result) {
      const { text } = TxtImporter.decodeBuffer(result.data);
      return {
        content: text,
        name: result.name,
        path: result.path
      };
    }
    throw new Error('未选择文件');
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.api.writeFile(path, content);
  }

  async saveAs(content: string, defaultName: string): Promise<string | null> {
    const result = await this.api.showSaveDialog({
      defaultPath: defaultName,
      filters: [
        { name: '支持的文件', extensions: ['txt', 'md', 'gfp'] },
        { name: '文本文件', extensions: ['txt', 'md'] },
        { name: 'GlyphForge工程文件', extensions: ['gfp'] }
      ]
    });
    
    if (result.filePath) {
      await this.api.writeFile(result.filePath, content);
      return result.filePath;
    }
    return null;
  }
}
