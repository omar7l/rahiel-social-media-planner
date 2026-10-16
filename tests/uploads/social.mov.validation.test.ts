import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { YoutubeProvider } from '../../libraries/nestjs-libraries/src/integrations/social/youtube.provider';
import { LinkedinProvider } from '../../libraries/nestjs-libraries/src/integrations/social/linkedin.provider';
import { PinterestProvider } from '../../libraries/nestjs-libraries/src/integrations/social/pinterest.provider';
import { InstagramStandaloneProvider } from '../../libraries/nestjs-libraries/src/integrations/social/instagram.standalone.provider';
import { DribbbleProvider } from '../../libraries/nestjs-libraries/src/integrations/social/dribbble.provider';
import { FarcasterProvider } from '../../libraries/nestjs-libraries/src/integrations/social/farcaster.provider';
import { SlackProvider } from '../../libraries/nestjs-libraries/src/integrations/social/slack.provider';
import { GmbProvider } from '../../libraries/nestjs-libraries/src/integrations/social/gmb.provider';
import { BlueskyProvider } from '../../libraries/nestjs-libraries/src/integrations/social/bluesky.provider';
import { RedditProvider } from '../../libraries/nestjs-libraries/src/integrations/social/reddit.provider';

afterEach(() => vi.restoreAllMocks());

describe.each([
  ['YouTube', YoutubeProvider],
  ['LinkedIn', LinkedinProvider],
  ['Pinterest', PinterestProvider],
  ['Instagram', InstagramStandaloneProvider],
  ['Dribbble', DribbbleProvider],
  ['Farcaster', FarcasterProvider],
  ['Slack', SlackProvider],
  ['Google Business', GmbProvider],
  ['Bluesky', BlueskyProvider],
  ['Reddit', RedditProvider],
] as const)('MOV video validation in %s', (_name, Provider) => {
  it.each([1, 2])(
    'applies the established video rules for %i media item(s)',
    async (count) => {
      const provider: any = new Provider();
      vi.spyOn(provider, 'getImageDimensions').mockResolvedValue({
        width: 720,
        height: 1280,
      });
      const media = (ext: string) => [
        [
          { path: `https://media.example.test/fixture.${ext}` },
          ...(count === 2
            ? [{ path: 'https://media.example.test/photo.jpg' }]
            : []),
        ],
      ];
      const settings = { post_type: 'post', is_trial_reel: 'yes' };
      const mp4 = await provider.checkValidity(media('mp4'), settings, []);
      const mov = await provider.checkValidity(media('MOV'), settings, []);
      expect(mov).toEqual(mp4);
    }
  );
});
