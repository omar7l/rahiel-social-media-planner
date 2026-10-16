import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaBox } from '../../apps/frontend/src/components/media/media.component';

const fixture = vi.hoisted(() => ({
  results: [
    {
      id: 'iphone',
      path: 'https://media.example.test/IMG_1234.MOV',
      thumbnail: null as string | null,
    },
    { id: 'mp4', path: 'https://media.example.test/video.mp4' },
    { id: 'photo', path: 'https://media.example.test/photo.jpg' },
  ],
}));
vi.mock('swr', () => ({
  default: () => ({
    data: { results: fixture.results, pages: 1 },
    isLoading: false,
    mutate: vi.fn(),
  }),
}));
vi.mock('@gitroom/helpers/utils/custom.fetch', () => ({
  useFetch: () => vi.fn(),
}));
vi.mock('@gitroom/react/translation/get.transation.service.client', () => ({
  useT: () => (_key: string, fallback: string) => fallback,
}));
vi.mock('@gitroom/react/toaster/toaster', () => ({
  useToaster: () => ({ show: vi.fn() }),
}));
vi.mock('@gitroom/frontend/components/media/new.uploader', () => ({
  useUppyUploader: () => ({}),
}));
vi.mock('@gitroom/frontend/components/layout/new-modal', () => ({
  useModals: () => ({ openModal: vi.fn(), closeCurrent: vi.fn() }),
}));
vi.mock('@gitroom/frontend/components/launches/helpers/use.values', () => ({
  useSettings: () => ({}),
}));
vi.mock('@gitroom/frontend/components/layout/user.context', () => ({
  useUser: () => ({}),
}));
vi.mock('@gitroom/frontend/components/new-launch/store', () => ({
  useLaunchStore: () => ({}),
}));
vi.mock('@gitroom/frontend/components/launches/ai.image', () => ({
  AiImage: () => null,
}));
vi.mock('@gitroom/frontend/components/launches/ai.video', () => ({
  AiVideo: () => null,
}));
vi.mock('@gitroom/frontend/components/layout/drop.files', () => ({
  DropFiles: ({ children }: any) => children,
}));
vi.mock('@gitroom/frontend/components/third-parties/third-party.media', () => ({
  ThirdPartyMedia: () => null,
}));
vi.mock(
  '@gitroom/frontend/components/third-parties/third-party.media-library',
  () => ({ ThirdPartyMediaLibrary: () => null })
);
vi.mock(
  '@gitroom/frontend/components/launches/helpers/media.settings.component',
  () => ({ MediaComponentInner: () => null })
);
vi.mock('@uppy/react', () => ({ Dashboard: () => null }));
vi.mock('react-sortablejs', () => ({
  ReactSortable: ({ children }: any) => children,
}));

function render(type?: 'image' | 'video') {
  return renderToStaticMarkup(
    React.createElement(MediaBox, {
      standalone: true,
      type,
      setMedia: vi.fn(),
      closeModal: vi.fn(),
    })
  );
}

describe('media-library video previews', () => {
  afterEach(() => {
    fixture.results[0].thumbnail = null;
  });
  it('shows a generated JPEG without requiring the browser to decode HEVC', () => {
    fixture.results[0].thumbnail = 'https://media.example.test/iphone-preview.jpg';
    const html = render('video');
    expect(html).toMatch(/<img[^>]+iphone-preview\.jpg/);
    expect(html).not.toMatch(/<video[^>]+IMG_1234\.MOV/);
  });
  it('renders an iPhone MOV as a video card', () => {
    const html = render();
    expect(html.match(/<(video|img)[^>]+IMG_1234\.MOV/)?.[1]).toBe('video');
    expect(html).not.toMatch(/<img[^>]+IMG_1234\.MOV/);
  });
  it('includes iPhone MOVs in the video picker', () => {
    const html = render('video');
    expect(html).toContain('IMG_1234.MOV');
    expect(html).toContain('video.mp4');
    expect(html).not.toContain('photo.jpg');
  });
  it('keeps videos out of the image picker', () => {
    const html = render('image');
    expect(html).toContain('photo.jpg');
    expect(html).not.toContain('IMG_1234.MOV');
    expect(html).not.toContain('video.mp4');
  });
});
