import { config } from '../config/index.js';
import { LocalStorage } from './local.js';
import { S3Storage } from './s3.js';

// Single point to select the driver. Local dev needs no AWS packages loaded at runtime.
let instance;
export function getStorage() {
  if (!instance) instance = config.STORAGE_DRIVER === 's3' ? new S3Storage(config) : new LocalStorage(config);
  return instance;
}
export const __setStorageForTests = (s) => { instance = s; };
