import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VideoOrImage } from '../../libraries/react-shared-libraries/src/helpers/video.or.image';
import { isVideoFile } from '../../libraries/helpers/src/utils/is.video.file';

describe('media previews', () => {
  it('renders an uploaded iPhone MOV as a video instead of a broken image', () => {
    const html = renderToStaticMarkup(
      React.createElement(VideoOrImage, {
        src: 'https://media.example.test/IMG_1234.MOV',
        autoplay: false,
      })
    );
    expect(html).toContain('<video');
    expect(html).not.toContain('<img');
  });
  it.each([
    ['https://media.example.test/video.mp4', true],
    ['/uploads/IMG_1234.MOV?download=1#t=0.1', true],
    ['/uploads/video.mov#t=0.1', true],
    ['/uploads/photo.jpg?filename=video.mov', false],
    ['/uploads/folder.mp4/photo.jpg', false],
    ['/uploads/photo.jpg', false],
    [undefined, false],
    [null, false],
  ])(
    'classifies the media path %s without using its query string',
    (path, expected) => {
      expect(isVideoFile(path)).toBe(expected);
    }
  );
  it('keeps image and MP4 previews working', () => {
    const image = renderToStaticMarkup(
      React.createElement(VideoOrImage, { src: '/photo.jpg', autoplay: false })
    );
    const video = renderToStaticMarkup(
      React.createElement(VideoOrImage, { src: '/video.mp4', autoplay: false })
    );
    expect(image).toContain('<img');
    expect(image).not.toContain('<video');
    expect(video).toContain('<video');
  });
});
