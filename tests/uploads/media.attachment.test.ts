import { validateSync } from 'class-validator';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaDto } from '../../libraries/nestjs-libraries/src/dtos/media/media.dto';

afterEach(() => vi.unstubAllEnvs());

describe('uploaded MOV attachments', () => {
  it('accepts an uploaded MOV when attaching media to a post', () => {
    const media = Object.assign(new MediaDto(), {
      id: 'iphone-fixture',
      path: 'https://media.example.test/iphone.mov',
    });
    expect(validateSync(media)).toEqual([]);
  });
  it('still rejects unsupported attachment types', () => {
    const media = Object.assign(new MediaDto(), {
      id: 'fixture',
      path: 'https://media.example.test/page.html',
    });
    expect(validateSync(media)[0].constraints).toHaveProperty(
      'checkValidExtension'
    );
  });
  it('still enforces the configured upload domain for MOV attachments', () => {
    vi.stubEnv('RESTRICT_UPLOAD_DOMAINS', 'https://media.example.test/');
    const media = Object.assign(new MediaDto(), {
      id: 'fixture',
      path: 'https://other.example.test/video.mov',
    });
    expect(validateSync(media)[0].constraints).toHaveProperty('checkValidPath');
  });
});
