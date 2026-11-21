import fs from 'node:fs/promises';
import path from 'node:path';

export class LocalStorage {
  constructor(config) {
    this.root = path.resolve(process.cwd(), config.UPLOAD_DIR);
  }
  resolve(key) {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error('Invalid storage key');
    return full;
  }
  async put(key, buffer) {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, buffer, { flag: 'wx' });
  }
  async get(key) {
    return fs.readFile(this.resolve(key));
  }
  async delete(key) {
    await fs.rm(this.resolve(key), { force: true });
  }
}
