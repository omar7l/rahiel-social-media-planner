import { IUploadProvider } from './upload.interface';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, realpath, rm, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { ssrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';

const run = promisify(execFile);
const MAX_INPUT_BYTES = 1024 ** 3;
class ThumbnailSizeError extends Error {}

export async function createVideoThumbnail(
  storage: IUploadProvider,
  media: { name: string; path: string }
): Promise<Buffer> {
  const directory = await mkdtemp(join(tmpdir(), 'postiz-thumbnail-'));
  try {
    let input: string;
    if (storage.signDownloadUrl) {
      // Mint the URL from our storage key. Never fetch the media's supplied URL.
      const url = await storage.signDownloadUrl(media.name);
      if (new URL(url).protocol !== 'https:')
        throw new Error('Unsafe storage URL');
      const signal = AbortSignal.timeout(90_000);
      const response = await fetch(url, {
        // @ts-ignore — undici dispatcher is not part of the DOM RequestInit
        dispatcher: ssrfSafeDispatcher,
        redirect: 'error',
        signal,
      });
      if (Number(response.headers.get('content-length')) > MAX_INPUT_BYTES) {
        await response.body?.cancel();
        throw new ThumbnailSizeError(
          'Video is too large for thumbnail generation'
        );
      }
      if (!response.ok || !response.body)
        throw new Error('Storage download failed');
      let size = 0;
      input = join(directory, 'source.mov');
      await pipeline(
        Readable.fromWeb(response.body as any),
        new Transform({
          transform(chunk, _encoding, callback) {
            size += chunk.length;
            callback(
              size > MAX_INPUT_BYTES
                ? new ThumbnailSizeError(
                    'Video is too large for thumbnail generation'
                  )
                : null,
              chunk
            );
          },
        }),
        createWriteStream(input, { mode: 0o600 }),
        { signal }
      );
    } else {
      // Local uploads already exist on disk. Resolve within the configured
      // uploads directory, including symlinks, rather than trusting a URL path.
      const base = new URL(
        process.env.FRONTEND_URL!.replace(/\/$/, '') + '/uploads/'
      );
      const url = new URL(media.path);
      if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname))
        throw new Error('Not a local upload');
      const root = await realpath(process.env.UPLOAD_DIRECTORY!);
      input = await realpath(
        resolve(
          root,
          decodeURIComponent(url.pathname.slice(base.pathname.length))
        )
      );
      if (!input.startsWith(root + sep)) throw new Error('Not a local upload');
      const source = await stat(input);
      if (!source.isFile()) throw new Error('Not a file');
      if (source.size > MAX_INPUT_BYTES)
        throw new ThumbnailSizeError(
          'Video is too large for thumbnail generation'
        );
    }
    const { stdout } = await run(
      process.env.FFMPEG_PATH || 'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-nostdin',
        '-protocol_whitelist',
        'file,pipe',
        '-threads',
        '2',
        '-f',
        'mov',
        '-i',
        input,
        '-map',
        '0:v:0',
        '-frames:v',
        '1',
        '-an',
        '-sn',
        '-dn',
        '-filter_threads',
        '1',
        '-vf',
        'scale=480:480:force_original_aspect_ratio=decrease',
        '-threads',
        '1',
        '-c:v',
        'mjpeg',
        '-q:v',
        '3',
        '-f',
        'image2pipe',
        'pipe:1',
      ],
      {
        encoding: 'buffer',
        timeout: 30_000,
        killSignal: 'SIGKILL',
        maxBuffer: 2 * 1024 ** 2,
      }
    );
    if (!stdout.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
      throw new Error('Invalid thumbnail');
    return stdout;
  } catch (error) {
    // Child-process errors include arguments/stderr; keep signed storage URLs
    // and uploaded metadata out of activity errors and logs.
    if (error instanceof ThumbnailSizeError) throw error;
    throw new Error('Could not generate video thumbnail');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
