import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { LocalStorage } from '../storage/local.js';
import { S3Storage } from '../storage/s3.js';
import { TRANSITIONS, canTransition, canWithdraw } from '../utils/statusFlow.js';

describe('LocalStorage', () => {
  it('stores, reads and deletes; rejects traversal and overwrites', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jp-store-'));
    const s = new LocalStorage({ UPLOAD_DIR: dir });
    await s.put('resumes/u1/a.pdf', Buffer.from('hello'));
    expect((await s.get('resumes/u1/a.pdf')).toString()).toBe('hello');
    await expect(s.put('resumes/u1/a.pdf', Buffer.from('x'))).rejects.toThrow(); // never overwrite
    await expect(s.get('../../etc/passwd')).rejects.toThrow('Invalid storage key');
    await s.delete('resumes/u1/a.pdf');
    await expect(s.get('resumes/u1/a.pdf')).rejects.toThrow();
    await fs.rm(dir, { recursive: true, force: true });
  });
});

describe('S3Storage (mocked client, no AWS access)', () => {
  it('sends put/get/delete commands to the configured bucket using default credential chain', async () => {
    const s = new S3Storage({ S3_BUCKET: 'my-bucket', AWS_REGION: 'us-east-1' });
    const send = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) } })
      .mockResolvedValueOnce({});
    s.client = { send };
    await s.put('resumes/u/a.pdf', Buffer.from('x'), 'application/pdf');
    expect((await s.get('resumes/u/a.pdf')).equals(Buffer.from([1, 2, 3]))).toBe(true);
    await s.delete('resumes/u/a.pdf');
    expect(send.mock.calls.map((c) => c[0].constructor.name)).toEqual(['PutObjectCommand', 'GetObjectCommand', 'DeleteObjectCommand']);
    expect(send.mock.calls[0][0].input).toMatchObject({ Bucket: 'my-bucket', Key: 'resumes/u/a.pdf', ContentType: 'application/pdf' });
  });
});

describe('S3Storage key prefix (per-environment isolation)', () => {
  it('prepends S3_KEY_PREFIX to every object key', async () => {
    const s = new S3Storage({ S3_BUCKET: 'b', AWS_REGION: 'us-east-1', S3_KEY_PREFIX: 'staging/' });
    const send = vi.fn().mockResolvedValue({ Body: { transformToByteArray: async () => new Uint8Array([1]) } });
    s.client = { send };
    await s.put('resumes/u/a.pdf', Buffer.from('x'), 'application/pdf');
    await s.get('resumes/u/a.pdf');
    await s.delete('resumes/u/a.pdf');
    expect(send.mock.calls.map((c) => c[0].input.Key)).toEqual(['staging/resumes/u/a.pdf', 'staging/resumes/u/a.pdf', 'staging/resumes/u/a.pdf']);
  });
});

describe('status workflow rules', () => {
  it('only allows the documented transitions', () => {
    expect(TRANSITIONS.APPLIED).toEqual(['SHORTLISTED', 'REJECTED']);
    expect(canTransition('APPLIED', 'OFFER')).toBe(false);
    expect(canTransition('INTERVIEW', 'OFFER')).toBe(true);
    expect(canTransition('OFFER', 'REJECTED')).toBe(false);
    expect(canTransition('REJECTED', 'APPLIED')).toBe(false);
    expect(canWithdraw('INTERVIEW')).toBe(true);
    expect(canWithdraw('OFFER')).toBe(false);
  });
});
