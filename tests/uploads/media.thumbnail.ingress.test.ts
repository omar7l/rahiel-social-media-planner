import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaService } from '../../libraries/nestjs-libraries/src/database/prisma/media/media.service';
import { UploadFactory } from '../../libraries/nestjs-libraries/src/upload/upload.factory';

vi.mock('@gitroom/nestjs-libraries/redis/redis.service', () => ({
  ioRedis: {},
}));
function setup() {
  const media = {
    id: 'fixture',
    name: 'iphone.mov',
    path: 'https://media.example.test/iphone.mov',
    thumbnail: null,
    status: 'ready',
  };
  const repository = {
    saveFile: vi.fn().mockResolvedValue(media),
    getMedia: vi.fn().mockResolvedValue({ results: [media], pages: 1 }),
  };
  vi.spyOn(UploadFactory, 'createStorage').mockReturnValue({} as any);
  vi.spyOn(UploadFactory, 'createProcessor').mockReturnValue(null);
  // A slow queue must not hold either the upload response or library listing.
  const thumbnails = { queue: vi.fn(() => new Promise<void>(() => {})) };
  const service = new MediaService(
    repository as any,
    {} as any,
    {} as any,
    {} as any,
    { client: { getRawClient: () => null } } as any,
    thumbnails as any
  );
  return { media, service, thumbnails };
}
afterEach(() => vi.restoreAllMocks());
describe('thumbnail scheduling at upload entry points', () => {
  it('queues server/public/simple uploads without waiting for the queue', async () => {
    const { media, service, thumbnails } = setup();
    expect(await service.saveFile('owner', media.name, media.path)).toBe(media);
    expect(thumbnails.queue).toHaveBeenCalledWith(media);
  });
  it('queues a multipart upload exactly once', async () => {
    const { media, service, thumbnails } = setup();
    expect(
      await service.saveUploadedFile('owner', media.name, media.path)
    ).toBe(media);
    expect(thumbnails.queue).toHaveBeenCalledTimes(1);
  });
  it('schedules an existing library page without waiting for thumbnail work', async () => {
    const { media, service, thumbnails } = setup();
    expect((await service.getMedia('owner', 1)).results).toEqual([media]);
    expect(thumbnails.queue).toHaveBeenCalledWith(media);
  });
});
