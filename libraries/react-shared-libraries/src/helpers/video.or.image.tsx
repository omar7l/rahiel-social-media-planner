import { FC } from 'react';
import { clsx } from 'clsx';
import { isVideoFile } from '@gitroom/helpers/utils/is.video.file';
export const VideoOrImage: FC<{
  src: string;
  autoplay: boolean;
  isContain?: boolean;
  imageClassName?: string;
  videoClassName?: string;
}> = (props) => {
  const { src, autoplay, isContain, imageClassName, videoClassName } = props;
  if (isVideoFile(src)) {
    return (
      <video
        src={src}
        autoPlay={autoplay}
        className={clsx('w-full h-full', videoClassName)}
        muted={true}
        loop={true}
      />
    );
  }
  return (
    <img
      className={clsx(
        isContain ? 'object-contain' : 'object-cover',
        'w-full h-full',
        imageClassName
      )}
      src={src}
    />
  );
};
