import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaThumbnailService } from '../../libraries/nestjs-libraries/src/database/prisma/media/media.thumbnail.service';
import { MediaRepository } from '../../libraries/nestjs-libraries/src/database/prisma/media/media.repository';
import { UploadFactory } from '../../libraries/nestjs-libraries/src/upload/upload.factory';

const mocks = vi.hoisted(() => ({
  redis: { set: vi.fn(), del: vi.fn() },
  thumbnail: vi.fn(),
}));
vi.mock('@gitroom/nestjs-libraries/redis/redis.service', () => ({
  ioRedis: mocks.redis,
}));
vi.mock('@gitroom/nestjs-libraries/upload/video.thumbnail', () => ({
  createVideoThumbnail: mocks.thumbnail,
}));

function setup() {
  const media = {
    id: 'owned-media',
    organizationId: 'owner',
    name: 'iphone.mov',
    path: 'https://media.example.test/iphone.mov',
    thumbnail: null,
    status: 'ready',
    deletedAt: null,
  };
  const model = {
    findUnique: vi.fn().mockResolvedValue(media),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  const repository = new MediaRepository({ model: { media: model } } as any);
  const storage = {
    uploadFile: vi
      .fn()
      .mockResolvedValue({ path: 'https://media.example.test/thumbnail.jpg' }),
    removeFile: vi.fn(),
  };
  vi.spyOn(UploadFactory, 'createStorage').mockReturnValue(storage as any);
  const start = vi.fn().mockResolvedValue({});
  const service = new MediaThumbnailService(repository, {
    client: { getRawClient: () => ({ workflow: { start } }) },
  } as any);
  return { service, media, model, storage, start };
}
beforeEach(() => {
  mocks.redis.set.mockResolvedValue('OK');
  mocks.redis.del.mockResolvedValue(1);
  mocks.thumbnail.mockResolvedValue(Buffer.from([0xff, 0xd8, 0xff]));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe('non-destructive media thumbnails', () => {
  it('queues a MOV once without changing upload readiness', async () => {
    const { service, media, start } = setup();
    mocks.redis.set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);
    await service.queue(media);
    await service.queue(media);
    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith(
      'generateMediaThumbnailWorkflow',
      expect.objectContaining({
        taskQueue: 'main',
        args: [{ mediaId: media.id }],
      })
    );
    expect(media.status).toBe('ready');
  });
  it('does not queue images, existing thumbnails, or disabled deployments', async () => {
    const { service, media, start } = setup();
    await service.queue({ ...media, path: '/photo.jpg' });
    await service.queue({ ...media, thumbnail: '/custom.jpg' });
    vi.stubEnv('DISABLE_VIDEO_THUMBNAILS', 'true');
    await service.queue(media);
    expect(start).not.toHaveBeenCalled();
    expect(mocks.redis.set).not.toHaveBeenCalled();
  });
  it('keeps uploads usable when the background queue is unavailable', async () => {
    const { service, media, start } = setup();
    start.mockRejectedValue(new Error('queue unavailable'));
    await expect(service.queue(media)).resolves.toBeUndefined();
    expect(mocks.redis.del).toHaveBeenCalled();
    expect(media.status).toBe('ready');
  });
  it('writes only a thumbnail, guarded by owner, source, and an empty thumbnail', async () => {
    const { service, media, model, storage } = setup();
    const original = { ...media };
    await service.generate(media.id);
    expect(media).toEqual(original);
    expect(storage.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ mimetype: 'image/jpeg' })
    );
    expect(model.updateMany).toHaveBeenCalledWith({
      where: {
        id: media.id,
        organizationId: media.organizationId,
        path: media.path,
        deletedAt: null,
        OR: [{ thumbnail: null }, { thumbnail: '' }],
      },
      data: { thumbnail: 'https://media.example.test/thumbnail.jpg' },
    });
    expect(storage.removeFile).not.toHaveBeenCalled();
  });
  it('preserves a custom cover selected during generation and removes only the unused JPEG', async () => {
    const { service, media, model, storage } = setup();
    model.updateMany.mockResolvedValue({ count: 0 });
    await service.generate(media.id);
    expect(storage.removeFile).toHaveBeenCalledWith(
      'https://media.example.test/thumbnail.jpg'
    );
    expect(storage.removeFile).not.toHaveBeenCalledWith(media.path);
  });
  it('leaves the original available when decoding fails', async () => {
    const { service, media, model, storage } = setup();
    mocks.thumbnail.mockRejectedValue(
      new Error('Could not generate video thumbnail')
    );
    await expect(service.generate(media.id)).rejects.toThrow(
      'Could not generate video thumbnail'
    );
    expect(media.status).toBe('ready');
    expect(model.updateMany).not.toHaveBeenCalled();
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });
  it('skips deleted media and existing custom thumbnails', async () => {
    const { service, media } = setup();
    media.deletedAt = new Date() as any;
    await service.generate(media.id);
    media.deletedAt = null;
    media.thumbnail = 'custom.jpg' as any;
    await service.generate(media.id);
    expect(mocks.thumbnail).not.toHaveBeenCalled();
  });
});
