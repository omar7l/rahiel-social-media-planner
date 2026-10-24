import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TiktokProvider } from '../../libraries/nestjs-libraries/src/integrations/social/tiktok.provider';
import { InstagramProvider } from '../../libraries/nestjs-libraries/src/integrations/social/instagram.provider';
import { YoutubeProvider } from '../../libraries/nestjs-libraries/src/integrations/social/youtube.provider';
import { TiktokBusinessProvider } from '../../libraries/nestjs-libraries/src/integrations/social/tiktok.business.provider';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// Providers only open local media inside UPLOAD_DIRECTORY.
const uploadFixture = (name: string) => {
  vi.stubEnv(
    'UPLOAD_DIRECTORY',
    fileURLToPath(new URL('./fixtures', import.meta.url))
  );
  return fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
};

describe('native MOV publishing requests', () => {
  it('routes a MOV to the TikTok Business video publishing endpoint', async () => {
    const provider = new TiktokBusinessProvider();
    const photo = vi
      .spyOn(provider as any, 'buildPhotoBody')
      .mockResolvedValue({});
    const request = vi
      .spyOn(provider as any, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ code: 0, data: { share_id: 'fixture-share' } })
        )
      );
    await provider.postPending(
      'fixture-user',
      'fixture-token',
      [
        {
          id: 'fixture-post',
          message: 'Fixture',
          media: [{ path: 'https://media.example.test/iphone.mov' }],
          settings: { content_posting_method: 'DIRECT_POST' },
        },
      ] as any,
      {} as any
    );
    expect(photo).not.toHaveBeenCalled();
    expect(request.mock.calls[0][0]).toContain('/business/video/publish/');
    expect(JSON.parse((request.mock.calls[0][1] as any).body)).toHaveProperty(
      'video_url',
      'https://media.example.test/iphone.mov'
    );
  });
  it('uploads QuickTime to TikTok through the video endpoint with its actual MIME type', async () => {
    const provider = new TiktokProvider();
    const path = uploadFixture('iphone.mov');
    const bytes = readFileSync(path);
    const init = vi.spyOn(provider as any, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            publish_id: 'fixture',
            upload_url: 'https://upload.example.test/video',
          },
        })
      )
    );
    let uploaded: Buffer | undefined;
    const transfer = vi.fn(async (_url: string, options: any) => {
      const chunks: Buffer[] = [];
      for await (const chunk of options.body) chunks.push(Buffer.from(chunk));
      uploaded = Buffer.concat(chunks);
      return new Response(null, { status: 201 });
    });
    vi.stubGlobal('fetch', transfer);
    const result = await provider.postPending(
      'fixture-user',
      'fixture-token',
      [
        {
          id: 'fixture-post',
          message: 'Fixture video',
          media: [{ path }],
          settings: { content_posting_method: 'DIRECT_POST' },
        },
      ] as any,
      {} as any
    );
    expect(init.mock.calls[0][0]).toContain('/publish/video/init/');
    const payload = JSON.parse((init.mock.calls[0][1] as any).body);
    expect(payload.source_info).toMatchObject({
      source: 'FILE_UPLOAD',
      video_size: bytes.length,
    });
    expect(transfer.mock.calls[0][1].headers['Content-Type']).toBe(
      'video/quicktime'
    );
    expect(uploaded).toEqual(bytes);
    expect(result[0].status).toBe('pending');
  });
  it('validates a TikTok MOV as video without running image-dimension checks', async () => {
    const provider = new TiktokProvider();
    const dimensions = vi
      .spyOn(provider as any, 'getImageDimensions')
      .mockResolvedValue({ width: 720, height: 1280 });
    expect(
      await provider.checkValidity([
        [{ path: 'https://media.example.test/iphone.mov' }],
      ])
    ).toBe(true);
    expect(dimensions).not.toHaveBeenCalled();
    expect(
      await provider.checkValidity([
        [{ path: '/iphone.mov' }, { path: '/photo.jpg' }],
      ])
    ).toBe('Only pictures are supported when selecting multiple items');
  });
  it('sends a MOV to the Instagram Reels video request path', async () => {
    const provider = new InstagramProvider();
    const request = vi
      .spyOn(provider as any, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 'fixture-container' }))
      );
    const result = await provider.postPending(
      'fixture-user',
      'fixture-token',
      [
        {
          id: 'fixture-post',
          message: 'Fixture video',
          media: [{ path: 'https://media.example.test/iphone.mov' }],
          settings: { post_type: 'post', audio: { id: 'fixture-audio' } },
        },
      ] as any,
      {} as any
    );
    const url = new URL(request.mock.calls[0][0] as string);
    expect(url.searchParams.get('media_type')).toBe('REELS');
    expect(url.searchParams.get('video_url')).toBe(
      'https://media.example.test/iphone.mov'
    );
    expect(url.searchParams.has('image_url')).toBe(false);
    expect(
      JSON.parse(url.searchParams.get('audio_configuration')!)
    ).toHaveProperty('audio_id', 'fixture-audio');
    expect(result[0].status).toBe('pending');
  });
  it('declares QuickTime for a YouTube resumable upload session', async () => {
    const provider = new YoutubeProvider();
    const path = uploadFixture('iphone.mov');
    const request = vi.spyOn(provider as any, 'fetch').mockResolvedValue(
      new Response(null, {
        headers: { location: 'https://upload.example.test/youtube' },
      })
    );
    await provider.postPending(
      'fixture-user',
      'fixture-token',
      [
        {
          id: 'fixture-post',
          message: 'Fixture',
          media: [{ path }],
          settings: { title: 'Fixture', type: 'private' },
        },
      ] as any,
      {} as any
    );
    expect(
      (request.mock.calls[0][1] as any).headers['X-Upload-Content-Type']
    ).toBe('video/quicktime');
  });
});
