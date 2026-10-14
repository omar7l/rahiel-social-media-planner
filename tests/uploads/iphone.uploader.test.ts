import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { useUppyUploader } from '../../apps/frontend/src/components/media/new.uploader';

vi.mock('@gitroom/helpers/utils/custom.fetch', () => ({
  useFetch: () => vi.fn(),
}));
vi.mock('@gitroom/react/helpers/variable.context', () => ({
  useVariables: () => ({
    storageProvider: 'cloudflare',
    backendUrl: 'http://localhost',
    disableImageCompression: true,
    transloadit: [],
    mediaProcessing: false,
  }),
}));
vi.mock('@gitroom/react/translation/get.transation.service.client', () => ({
  useT: () => (_key: string, fallback: string) => fallback,
}));
vi.mock('@gitroom/react/toaster/toaster', () => ({
  useToaster: () => ({ show: vi.fn() }),
}));
vi.mock('@gitroom/frontend/components/new-launch/store', () => ({
  useLaunchStore: (select: any) => select({ setLocked: vi.fn() }),
}));
vi.mock('@uppy/react', () => ({
  Dashboard: () => null,
  FileInput: () => null,
  ProgressBar: () => null,
}));
vi.mock('@gitroom/react/helpers/uppy.upload', async (importOriginal) => {
  const actual = await importOriginal<any>();
  const { BasePlugin } = await import('@uppy/core');
  class MemoryUpload extends BasePlugin<any, any, any> {
    constructor(uppy: any, opts: any) {
      super(uppy, opts);
      this.id = 'MemoryUpload';
      this.type = 'uploader';
    }
    upload = async (ids: string[]) => {
      for (const id of ids) {
        const file = this.uppy.getFile(id);
        this.uppy.emit('upload-success', file, {
          body: {
            Location: 'https://media.example.test/fixture.mov',
            saved: { id: 'fixture', name: file.name, status: 'ready' },
          },
          uploadURL: 'https://media.example.test/fixture.mov',
        });
      }
    };
    install() {
      this.uppy.addUploader(this.upload);
    }
    uninstall() {
      this.uppy.removeUploader(this.upload);
    }
  }
  return {
    ...actual,
    getUppyUploadPlugin: () => ({ plugin: MemoryUpload, options: {} }),
  };
});

afterEach(() => vi.restoreAllMocks());

describe('iPhone uploads without an optional converter', () => {
  it.each([
    ['IMG_1234.MOV', 'video/quicktime', 'iphone.mov'],
    ['video.mp4', 'video/mp4', 'video.mp4'],
  ])(
    'passes %s through the production uploader preprocessing',
    async (name, type, fixture) => {
      const success = vi.fn();
      let uppy: ReturnType<typeof useUppyUploader>;
      function Probe() {
        uppy = useUppyUploader({
          allowedFileTypes: 'image/*,video/mp4',
          onUploadSuccess: success,
          onStart: vi.fn(),
          onEnd: vi.fn(),
        });
        return null;
      }
      renderToString(React.createElement(Probe));
      uppy!.setOptions({ autoProceed: false });
      try {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const movie = readFileSync(
          new URL('./fixtures/' + fixture, import.meta.url)
        );
        uppy!.addFile({ name, type, data: new Blob([movie], { type }) });
        const result = await uppy!.upload();
        expect(result.successful).toHaveLength(1);
        expect(result.failed).toHaveLength(0);
        expect(success).toHaveBeenCalledWith([
          expect.objectContaining({ name, status: 'ready' }),
        ]);
      } finally {
        uppy!.destroy();
      }
    }
  );
});
