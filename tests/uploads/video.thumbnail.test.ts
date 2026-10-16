import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  readFileSync,
  readdirSync,
  mkdtempSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { createVideoThumbnail } from '../../libraries/nestjs-libraries/src/upload/video.thumbnail';

const fixture = new URL('./fixtures/iphone-hevc.mov', import.meta.url);
const video = readFileSync(fixture);
const digest = () =>
  createHash('sha256').update(readFileSync(fixture)).digest('hex');
const temporaryFolders = () =>
  readdirSync(tmpdir())
    .filter((name) => name.startsWith('postiz-thumbnail-'))
    .sort();
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('background video thumbnail generation', () => {
  it('reads local uploads without changing or deleting the original', async () => {
    const root = mkdtempSync(join(tmpdir(), 'thumbnail-local-test-'));
    try {
      vi.stubEnv('UPLOAD_DIRECTORY', root);
      vi.stubEnv('FRONTEND_URL', 'https://planner.example.test');
      const source = join(root, 'iphone.mov');
      writeFileSync(source, video);
      const image = await createVideoThumbnail({} as any, {
        name: 'iphone.mov',
        path: 'https://planner.example.test/uploads/iphone.mov',
      });
      expect(image.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
      expect(readFileSync(source)).toEqual(video);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it('refuses a local symlink that escapes the upload directory', async () => {
    const root = mkdtempSync(join(tmpdir(), 'thumbnail-local-test-'));
    try {
      vi.stubEnv('UPLOAD_DIRECTORY', root);
      vi.stubEnv('FRONTEND_URL', 'https://planner.example.test');
      symlinkSync(fileURLToPath(fixture), join(root, 'escape.mov'));
      await expect(
        createVideoThumbnail({} as any, {
          name: 'escape.mov',
          path: 'https://planner.example.test/uploads/escape.mov',
        })
      ).rejects.toThrow('Could not generate video thumbnail');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it('decodes genuine 10-bit HEVC into a small JPEG and preserves the source video', async () => {
    const before = digest();
    const folders = temporaryFolders();
    const storage = {
      signDownloadUrl: vi
        .fn()
        .mockResolvedValue(
          'https://storage.example.test/owned.mov?signature=fixture'
        ),
    };
    const request = vi.fn().mockResolvedValue(new Response(video));
    vi.stubGlobal('fetch', request);
    const image = await createVideoThumbnail(storage as any, {
      name: 'owned.mov',
      path: 'http://127.0.0.1/untrusted.mov',
    });
    expect(storage.signDownloadUrl).toHaveBeenCalledWith('owned.mov');
    expect(request.mock.calls[0][0]).toBe(
      'https://storage.example.test/owned.mov?signature=fixture'
    );
    expect(image.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
    expect(image.length).toBeLessThan(100_000);
    expect(digest()).toBe(before);
    expect(temporaryFolders()).toEqual(folders);
  });

  it('rejects an oversized source before downloading it', async () => {
    const folders = temporaryFolders();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          headers: { 'content-length': String(1024 ** 3 + 1) },
        })
      )
    );
    await expect(
      createVideoThumbnail(
        {
          signDownloadUrl: async () => 'https://storage.example.test/owned.mov',
        } as any,
        { name: 'owned.mov', path: '/owned.mov' }
      )
    ).rejects.toThrow('too large');
    expect(temporaryFolders()).toEqual(folders);
  });

  it('cleans up a corrupt video and does not expose signed URLs in the error', async () => {
    const folders = temporaryFolders();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('not a movie'))
    );
    await expect(
      createVideoThumbnail(
        {
          signDownloadUrl: async () =>
            'https://storage.example.test/owned.mov?signature=private',
        } as any,
        { name: 'owned.mov', path: '/owned.mov' }
      )
    ).rejects.toThrow('Could not generate video thumbnail');
    expect(temporaryFolders()).toEqual(folders);
  });
});
