export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface IFileSystem {
  readFile(options?: string | { path?: string, filters?: FileFilter[] }): Promise<{ content: string, name: string, path?: string }>;
  readBuffer(options?: string | { path?: string, filters?: FileFilter[] }): Promise<{ data: Uint8Array, name: string, path?: string }>;
  writeFile(path: string, content: string): Promise<void>;
  saveAs(content: string, defaultName: string): Promise<string | null>;
}

import { isElectron } from '@/utils/env';
import { WebFileSystem } from '@/core/bridge/web-fs';
import { ElectronFileSystem } from '@/core/bridge/electron-fs';

export const fsProvider: IFileSystem = isElectron ? new ElectronFileSystem() : new WebFileSystem();
