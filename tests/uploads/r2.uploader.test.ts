import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import type { Request, Response } from 'express';
import {
  prepareUploadParts,
  signPart,
} from '../../libraries/nestjs-libraries/src/upload/r2.uploader';

function responseCapture() {
  let body: any;
  const response = {
    status(code: number) {
      expect(code).toBe(200);
      return this;
    },
    json(value: any) {
      body = value;
      return this;
    },
  } as unknown as Response;
  return { response, body: () => body };
}

function expectBrowserUploadSignature(url: string) {
  const params = new URL(url).searchParams;
  expect(params.get('uploadId')).toBe('local-upload');
  expect(params.get('partNumber')).toBe('1');
  expect(params.has('X-Amz-Signature')).toBe(true);
  // The signer never receives the video bytes. An SDK-generated CRC32 here
  // describes an empty body (AAAAAA==), so real video bytes fail verification.
  expect(params.has('x-amz-checksum-crc32')).toBe(false);
  expect(params.has('x-amz-sdk-checksum-algorithm')).toBe(false);
}

describe('R2 multipart URLs for direct browser uploads', () => {
  it('uploads actual MP4 bytes to a checksum-validating storage endpoint', async () => {
    const video = readFileSync(
      new URL('./fixtures/video.mp4', import.meta.url)
    );
    // CRC32 of the checked-in, ffmpeg-generated one-second MP4 fixture.
    const expectedChecksum = 'Ye4aAA==';
    const capture = responseCapture();
    await signPart(
      {
        body: { key: 'video.mp4', uploadId: 'local-upload', partNumber: 1 },
      } as Request,
      capture.response
    );
    let received: Buffer;
    const storage = createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      received = Buffer.concat(chunks);
      const checksum = new URL(req.url!, 'http://localhost').searchParams.get(
        'x-amz-checksum-crc32'
      );
      res.statusCode = checksum && checksum !== expectedChecksum ? 400 : 200;
      res.end();
    });
    storage.listen(0, '127.0.0.1');
    await once(storage, 'listening');
    try {
      const address = storage.address() as { port: number };
      const signedQuery = new URL(capture.body().url).search;
      // Only the storage transport is local; the production SDK creates the URL.
      // This endpoint models checksum enforcement, not AWS signature validation.
      const result = await fetch(
        `http://127.0.0.1:${address.port}/${signedQuery}`,
        { method: 'PUT', body: video }
      );
      expect(result.status).toBe(200);
      expect(received!).toEqual(video);
    } finally {
      storage.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        storage.close((error) => (error ? reject(error) : resolve()))
      );
    }
  });

  it('signs a video part without binding it to an empty-body checksum', async () => {
    const capture = responseCapture();
    await signPart(
      {
        body: { key: 'video.mp4', uploadId: 'local-upload', partNumber: 1 },
      } as Request,
      capture.response
    );
    expectBrowserUploadSignature(capture.body().url);
  });

  it('prepares batch part URLs without an empty-body checksum', async () => {
    const capture = responseCapture();
    await prepareUploadParts(
      {
        body: {
          partData: {
            key: 'video.mp4',
            uploadId: 'local-upload',
            parts: [{ number: 1 }],
          },
        },
      } as Request,
      capture.response
    );
    expectBrowserUploadSignature(capture.body().presignedUrls[1]);
  });
});
