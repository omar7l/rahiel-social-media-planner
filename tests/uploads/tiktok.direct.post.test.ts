import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TikTokDto } from '../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/tiktok.dto';
import { TiktokProvider } from '../../libraries/nestjs-libraries/src/integrations/social/tiktok.provider';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const directPost = {
  content_posting_method: 'DIRECT_POST',
  privacy_level: 'PUBLIC_TO_EVERYONE',
  duet: false,
  stitch: false,
  comment: false,
  brand_content_toggle: false,
  brand_organic_toggle: false,
  autoAddMusic: 'no',
  video_made_with_ai: false,
  disclose: false,
};

const failingFields = async (settings: Record<string, unknown>) =>
  (await validate(plainToInstance(TikTokDto, { ...directPost, ...settings }))).map(
    (error) => error.property
  );

describe('TikTok direct post settings', () => {
  it('requires an explicit privacy choice for direct posts', async () => {
    expect(await failingFields({ privacy_level: undefined })).toContain('privacy_level');
  });

  it('does not require a privacy choice for upload-only drafts', async () => {
    expect(
      await failingFields({ content_posting_method: 'UPLOAD', privacy_level: undefined })
    ).not.toContain('privacy_level');
  });

  it('never allows branded content to be private', async () => {
    expect(
      await failingFields({ brand_content_toggle: true, privacy_level: 'SELF_ONLY' })
    ).toContain('privacy_level');
    expect(
      await failingFields({
        brand_content_toggle: true,
        privacy_level: 'MUTUAL_FOLLOW_FRIENDS',
      })
    ).not.toContain('privacy_level');
  });

  it('requires one commercial option when disclosure is on', async () => {
    expect(
      await failingFields({ disclose: true, brand_organic_toggle: false, brand_content_toggle: false })
    ).toContain('disclose');
    expect(
      await failingFields({ disclose: true, brand_organic_toggle: true })
    ).not.toContain('disclose');
  });

  it('does not default privacy to public when building the post', () => {
    const provider = new TiktokProvider() as any;
    const body = provider.buildTikokPostInfoBody({
      media: [{ path: '/uploads/clip.mp4' }],
      message: 'Hello',
      settings: { ...directPost, privacy_level: undefined },
    });
    expect(body.post_info.privacy_level).toBeUndefined();
  });

  it('keeps comments off unless the user turns them on', () => {
    const provider = new TiktokProvider() as any;
    const body = provider.buildTikokPostInfoBody({
      media: [{ path: '/uploads/clip.mp4' }],
      message: 'Hello',
      settings: directPost,
    });
    expect(body.post_info.disable_comment).toBe(true);
  });
});

describe('TikTok sign-in scopes', () => {
  it('requests only the scopes the planner reads or writes', () => {
    expect([...new TiktokProvider().scopes].sort()).toEqual(
      ['user.info.basic', 'user.info.stats', 'video.list', 'video.publish', 'video.upload']
    );
  });
});

describe('TikTok creator info', () => {
  it('returns only what the publishing screen needs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: { code: 'ok', message: '', log_id: 'x' },
              data: {
                creator_nickname: 'Rahiel Studios',
                creator_username: 'rahielstudios',
                creator_avatar_url: 'https://example.test/a.png',
                privacy_level_options: ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'],
                comment_disabled: true,
                duet_disabled: false,
                stitch_disabled: false,
                max_video_post_duration_sec: 600,
              },
            })
          )
      )
    );
    const info = await new TiktokProvider().creatorInfo('secret-access-token');
    expect(info).toEqual({
      nickname: 'Rahiel Studios',
      username: 'rahielstudios',
      privacyLevelOptions: ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'],
      commentDisabled: true,
      duetDisabled: false,
      stitchDisabled: false,
      maxVideoDurationSeconds: 600,
    });
    expect(JSON.stringify(info)).not.toContain('secret-access-token');
  });

  it('reports a TikTok error instead of returning empty options', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: { code: 'spam_risk_too_many_posts', message: '' }, data: {} })
          )
      )
    );
    await expect(new TiktokProvider().creatorInfo('token')).rejects.toThrow(
      'spam_risk_too_many_posts'
    );
  });
});
