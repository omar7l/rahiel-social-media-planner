import { proxyActivities } from '@temporalio/workflow';
import type { MediaActivity } from '@gitroom/orchestrator/activities/media.activity';

const { generateMediaThumbnail } = proxyActivities<MediaActivity>({
  taskQueue: 'video-thumbnails',
  startToCloseTimeout: '3 minutes',
  retry: { maximumAttempts: 2, initialInterval: '10 seconds' },
});

export async function generateMediaThumbnailWorkflow({
  mediaId,
}: {
  mediaId: string;
}) {
  await generateMediaThumbnail(mediaId);
}
