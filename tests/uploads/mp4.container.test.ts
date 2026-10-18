import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import {
  S3Client,
  CompleteMultipartUploadCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { completeMultipartUpload } from '../../libraries/nestjs-libraries/src/upload/r2.uploader';

afterEach(() => vi.restoreAllMocks());

async function completeMp4(bytes: Buffer) {
  const send = vi
    .spyOn(S3Client.prototype, 'send')
    .mockImplementation(async (command: any) => {
      if (command instanceof CompleteMultipartUploadCommand)
        return {
          Location: 'https://storage.example.test/padded.mp4',
          Key: 'padded.mp4',
        };
      if (command instanceof GetObjectCommand) {
        const range = /bytes=(\d+)-(\d+)/.exec(
          command.input.Range || 'bytes=0-4100'
        )!;
        const start = Number(range[1]),
          end = Math.min(Number(range[2]), bytes.length - 1);
        return {
          Body: Readable.from([bytes.subarray(start, end + 1)]),
          ContentRange: `bytes ${start}-${end}/${bytes.length}`,
        };
      }
      if (command instanceof DeleteObjectCommand) return {};
      throw new Error('Unexpected storage request');
    });
  let code = 200,
    body: any;
  const response = {
    status(value: number) {
      code = value;
      return this;
    },
    json(value: any) {
      body = value;
      return this;
    },
  };
  const result = await completeMultipartUpload(
    { body: { key: 'padded.mp4', uploadId: 'fixture', parts: [] } } as any,
    response as any
  );
  return { code, body, result, send };
}

describe('MP4 container validation', () => {
  it('accepts a playable MP4 with a leading padding box', async () => {
    // Generated H.264 MP4: move its existing free box ahead of ftyp, preserving
    // all media offsets. FFmpeg decodes the fixture successfully.
    const bytes = readFileSync(
      new URL('./fixtures/mp4-leading-free.mp4', import.meta.url)
    );
    const { code, body, result, send } = await completeMp4(bytes);
    expect({ code, body }).toEqual({ code: 200, body: undefined });
    expect(result.Location).toMatch(/\/padded\.mp4$/);
    expect(
      send.mock.calls.some(
        ([command]) => command instanceof DeleteObjectCommand
      )
    ).toBe(false);
  });
  it('accepts an MP4 video carrying an M4V video brand', async () => {
    const bytes = readFileSync(
      new URL('./fixtures/video.mp4', import.meta.url)
    );
    bytes.write('M4V ', 8, 'ascii');
    const { code, body } = await completeMp4(bytes);
    expect({ code, body }).toEqual({ code: 200, body: undefined });
  });
  it('finds the MP4 header beyond the initial sniffing range without downloading the movie', async () => {
    const bytes = readFileSync(
      new URL('./fixtures/mp4-leading-free-large.mp4', import.meta.url)
    );
    const { code, body, send } = await completeMp4(bytes);
    expect({ code, body }).toEqual({ code: 200, body: undefined });
    const reads = send.mock.calls
      .map(([command]) => command)
      .filter(
        (command) => command instanceof GetObjectCommand
      ) as GetObjectCommand[];
    expect(reads.map((command) => command.input.Range)).toEqual([
      'bytes=0-4100',
      'bytes=8192-12292',
    ]);
  });
  it('rejects an invalid format box even when its brand resembles MP4', async () => {
    const bytes = Buffer.alloc(16);
    bytes.writeUInt32BE(8);
    bytes.write('ftyp', 4);
    bytes.write('isom', 8);
    const { code, send } = await completeMp4(bytes);
    expect(code).toBe(400);
    expect(
      send.mock.calls.some(
        ([command]) => command instanceof DeleteObjectCommand
      )
    ).toBe(true);
  });
  it.each([0, 4, 1])(
    'rejects malformed padding of size %s without following unbounded offsets',
    async (size) => {
      const bytes = Buffer.alloc(32);
      bytes.writeUInt32BE(size);
      bytes.write('free', 4);
      if (size === 1) bytes.writeBigUInt64BE(2n ** 63n, 8);
      bytes.writeUInt32BE(16, 16);
      bytes.write('ftyp', 20);
      bytes.write('isom', 24);
      const { code, send } = await completeMp4(bytes);
      expect(code).toBe(400);
      expect(
        send.mock.calls.filter(
          ([command]) => command instanceof GetObjectCommand
        )
      ).toHaveLength(1);
    }
  );
  it('bounds the number of padding boxes inspected', async () => {
    const padding = Buffer.alloc(8 * 17);
    for (let offset = 0; offset < padding.length; offset += 8) {
      padding.writeUInt32BE(8, offset);
      padding.write('free', offset + 4);
    }
    const video = readFileSync(
      new URL('./fixtures/video.mp4', import.meta.url)
    );
    const { code, send } = await completeMp4(Buffer.concat([padding, video]));
    expect(code).toBe(400);
    expect(
      send.mock.calls.filter(([command]) => command instanceof GetObjectCommand)
    ).toHaveLength(1);
  });
});
