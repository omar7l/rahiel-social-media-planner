// Classify stored media URLs for display. Uploads validate the actual file bytes.
export const isVideoFile = (path: string | undefined | null): boolean => {
  const pathname = path?.split(/[?#]/, 1)[0];
  return !!pathname && /\.(mp4|mov)$/i.test(pathname);
};
