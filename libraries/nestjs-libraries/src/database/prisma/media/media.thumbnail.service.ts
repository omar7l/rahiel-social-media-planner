import { Injectable } from '@nestjs/common';
import { MediaRepository } from './media.repository';
import { TemporalService } from 'nestjs-temporal-core';
import { createHash } from 'node:crypto';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { createVideoThumbnail } from '@gitroom/nestjs-libraries/upload/video.thumbnail';
import { isVideoFile } from '@gitroom/helpers/utils/is.video.file';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';

@Injectable()
export class MediaThumbnailService {
  private storage = UploadFactory.createStorage();
  constructor(
    private repository: MediaRepository,
    private temporal: TemporalService
  ) {}
  async queue(media: { id: string; path: string; thumbnail?: string | null }) {
    if (
      process.env.DISABLE_VIDEO_THUMBNAILS === 'true' ||
      media.thumbnail ||
      !isVideoFile(media.path)
    )
      return;
    const source = createHash('sha256')
      .update(media.path)
      .digest('hex')
      .slice(0, 16);
    const workflowId = `video_thumbnail_${media.id}_${source}`;
    const key = `mediaThumbnail:${workflowId}`;
    let claimed = false;
    try {
      const client = this.temporal.client.getRawClient();
      if (
        !client ||
        (await ioRedis.set(key, 'queued', 'EX', 3600, 'NX')) !== 'OK'
      )
        return;
      claimed = true;
      await client.workflow.start('generateMediaThumbnailWorkflow', {
        workflowId,
        taskQueue: 'main',
        args: [{ mediaId: media.id }],
      });
    } catch {
      if (claimed) await ioRedis.del(key).catch(() => {});
      // Thumbnail availability must never decide whether an upload succeeds.
    }
  }

  async generate(mediaId: string) {
    if (process.env.DISABLE_VIDEO_THUMBNAILS === 'true') return;
    const media = await this.repository.getMediaById(mediaId);
    if (
      !media ||
      media.deletedAt ||
      media.thumbnail ||
      media.status !== 'ready' ||
      !isVideoFile(media.path)
    )
      return;
    const buffer = await createVideoThumbnail(this.storage, media);
    const uploaded = await this.storage.uploadFile({
      buffer,
      size: buffer.length,
      mimetype: 'image/jpeg',
      originalname: 'video-thumbnail.jpg',
    } as Express.Multer.File);
    try {
      const saved = await this.repository.setGeneratedThumbnail(
        media.organizationId,
        media.id,
        media.path,
        uploaded.path
      );
      if (saved.count) return;
    } catch (error) {
      await this.storage.removeFile(uploaded.path).catch(() => {});
      throw error;
    }
    // A manual cover, deleted media, or a changed source won the race.
    await this.storage.removeFile(uploaded.path);
  }
}
