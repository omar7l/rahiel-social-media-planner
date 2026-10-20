import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import {
  S3Client,
  CreateMultipartUploadCommand,
  GetObjectCommand,
  CompleteMultipartUploadCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import {
  createMultipartUpload,
  completeMultipartUpload,
  simpleUpload,
} from '../../libraries/nestjs-libraries/src/upload/r2.uploader';
import { LocalStorage } from '../../libraries/nestjs-libraries/src/upload/local.storage';
import { CloudflareStorage } from '../../libraries/nestjs-libraries/src/upload/cloudflare.storage';
import { uploadStreamToStorage } from '../../libraries/nestjs-libraries/src/upload/custom.upload.validation';

const movie = readFileSync(new URL('./fixtures/iphone.mov', import.meta.url));
function capture() {
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
  return { response: response as any, code: () => code, body: () => body };
}
function storage(bytes = movie) {
  return vi
    .spyOn(S3Client.prototype, 'send')
    .mockImplementation(async (command: any) => {
      if (command instanceof CreateMultipartUploadCommand)
        return { Key: command.input.Key, UploadId: 'fixture-upload' };
      if (command instanceof CompleteMultipartUploadCommand)
        return {
          Key: command.input.Key,
          Location: 'https://storage.example.test/' + command.input.Key,
        };
      if (command instanceof GetObjectCommand)
        return {
          Body: Readable.from([bytes]),
          Metadata: { 'x-amz-meta-file-hash': 'fixture-hash' },
        };
      if (command instanceof CopyObjectCommand)
        return { CopyObjectResult: { ETag: 'copied' } };
      if (command instanceof DeleteObjectCommand) return {};
      throw new Error('Unexpected storage operation');
    });
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('native QuickTime uploads', () => {
  it('creates and completes a genuine uppercase MOV without a converter', async () => {
    vi.stubEnv('RUNPOD_API_KEY', '');
    vi.stubEnv('RUNPOD_ENDPOINT_ID', '');
    const send = storage();
    const created = capture();
    await createMultipartUpload(
      { body: { file: { name: 'IMG_1234.MOV' }, fileHash: 'fixture' } } as any,
      created.response
    );
    expect(created.code()).toBe(200);
    expect(created.body().key).toMatch(/\.mov$/);
    const command = send.mock.calls[0][0] as CreateMultipartUploadCommand;
    expect(command.input.ContentType).toBe('video/quicktime');
    const completed = capture();
    const result = await completeMultipartUpload(
      {
        body: {
          ...created.body(),
          parts: [{ PartNumber: 1, ETag: 'fixture' }],
        },
      } as any,
      completed.response
    );
    expect(completed.code()).toBe(200);
    expect(result.Location).toMatch(/\.mov$/);
  });
  it('streams byte-validated QuickTime through the local API upload path', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'planner-quicktime-'));
    vi.stubEnv('FRONTEND_URL', 'https://planner.example.test');
    try {
      const local = new LocalStorage(directory);
      const saved = await uploadStreamToStorage(
        local,
        Readable.toWeb(Readable.from([movie])) as any
      );
      expect(saved.mimetype).toBe('video/quicktime');
      expect(saved.filename).toMatch(/\.mov$/);
      const disk =
        directory + new URL(saved.path).pathname.slice('/uploads'.length);
      expect(readFileSync(disk)).toEqual(movie);
      await local.removeFile(saved.path);
      expect(existsSync(disk)).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it('streams QuickTime into R2 with the detected content type', async () => {
    const send = vi
      .spyOn(S3Client.prototype, 'send')
      .mockResolvedValue({ ETag: 'fixture' } as never);
    const cloud = new CloudflareStorage(
      'fixture',
      'fixture',
      'fixture',
      'auto',
      'fixture',
      'https://media.example.test'
    );
    const saved = await uploadStreamToStorage(
      cloud,
      Readable.toWeb(Readable.from([movie])) as any
    );
    expect(saved.filename).toMatch(/\.mov$/);
    expect(saved.mimetype).toBe('video/quicktime');
    const command = send.mock.calls.find(
      ([command]) => command instanceof PutObjectCommand
    )![0] as PutObjectCommand;
    expect(command.input.ContentType).toBe('video/quicktime');
  });
  it('accepts a MOV containing an ISO MP4 brand without a converter', async () => {
    vi.stubEnv('RUNPOD_API_KEY', '');
    vi.stubEnv('RUNPOD_ENDPOINT_ID', '');
    storage(readFileSync(new URL('./fixtures/video.mp4', import.meta.url)));
    const completed = capture();
    const result = await completeMultipartUpload(
      { body: { key: 'iphone.mov', uploadId: 'fixture', parts: [] } } as any,
      completed.response
    );
    expect(completed.code()).toBe(200);
    expect(result.Location).toMatch(/\/iphone\.mov$/);
  });
  it('detects QuickTime bytes for a buffered upload instead of trusting the supplied MIME', async () => {
    const send = vi
      .spyOn(S3Client.prototype, 'send')
      .mockResolvedValue({ ETag: 'fixture' } as never);
    const url = await simpleUpload(
      movie,
      'IMG_1234.MOV',
      'application/octet-stream'
    );
    expect(url).toMatch(/\.mov$/);
    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command.input.ContentType).toBe('video/quicktime');
    expect(command.input.Body).toEqual(movie);
  });
  it.each([
    ['disguised.mov', Buffer.from('<html>This is not a movie</html>')],
    ['disguised.mp4', Buffer.from('<html>This is not a movie</html>')],
  ])(
    'rejects and removes content that does not match %s',
    async (key, bytes) => {
      vi.stubEnv('RUNPOD_API_KEY', '');
      vi.stubEnv('RUNPOD_ENDPOINT_ID', '');
      const send = storage(bytes),
        completed = capture();
      await completeMultipartUpload(
        { body: { key, uploadId: 'fixture', parts: [] } } as any,
        completed.response
      );
      expect(completed.code()).toBe(400);
      expect(completed.body()).toEqual({
        message: 'File contents do not match declared type.',
      });
      const deleted = send.mock.calls.find(
        ([command]) => command instanceof DeleteObjectCommand
      )![0] as DeleteObjectCommand;
      expect(deleted.input.Key).toBe(key);
    }
  );
  it('keeps a QuickTime original named MP4 and stores its real MOV type', async () => {
    vi.stubEnv('RUNPOD_API_KEY', '');
    vi.stubEnv('RUNPOD_ENDPOINT_ID', '');
    const send = storage(movie),
      completed = capture();
    const result = await completeMultipartUpload(
      {
        body: { key: 'mac-export.mp4', uploadId: 'fixture', parts: [] },
      } as any,
      completed.response
    );
    expect(completed.code()).toBe(200);
    expect(result.Location).toMatch(/\/mac-export\.mov$/);
    expect(result.Key).toBe('mac-export.mov');
    const copied = send.mock.calls.find(
      ([command]) => command instanceof CopyObjectCommand
    )![0] as CopyObjectCommand;
    expect(copied.input).toMatchObject({
      Key: 'mac-export.mov',
      CopySource: 'local-test-bucket/mac-export.mp4',
      ContentType: 'video/quicktime',
      MetadataDirective: 'REPLACE',
      Metadata: { 'x-amz-meta-file-hash': 'fixture-hash' },
    });
    const deleted = send.mock.calls.find(
      ([command]) => command instanceof DeleteObjectCommand
    )![0] as DeleteObjectCommand;
    expect(deleted.input.Key).toBe('mac-export.mp4');
  });
  it('fails completion and removes temporary objects if correcting the container fails', async () => {
    const send = storage(movie),
      completed = capture();
    const originalSend = send.getMockImplementation()!;
    send.mockImplementation(async (command: any) => {
      if (command instanceof CopyObjectCommand) throw new Error('copy failed');
      return originalSend(command);
    });
    await completeMultipartUpload(
      {
        body: { key: 'failed-export.mp4', uploadId: 'fixture', parts: [] },
      } as any,
      completed.response
    );
    expect(completed.code()).toBe(500);
    expect(
      send.mock.calls
        .map(([command]) => command)
        .filter((command) => command instanceof DeleteObjectCommand)
        .map((command) => command.input.Key)
    ).toEqual(['failed-export.mp4', 'failed-export.mov']);
  });
  it('rejects arbitrary stream contents before writing to storage', async () => {
    const cloud = new CloudflareStorage(
      'fixture',
      'fixture',
      'fixture',
      'auto',
      'fixture',
      'https://media.example.test'
    );
    const upload = vi.spyOn(cloud, 'uploadStream');
    await expect(
      uploadStreamToStorage(
        cloud,
        Readable.toWeb(
          Readable.from([Buffer.from('<html>not a movie</html>')])
        ) as any
      )
    ).rejects.toThrow('Unsupported file type.');
    expect(upload).not.toHaveBeenCalled();
  });
});
