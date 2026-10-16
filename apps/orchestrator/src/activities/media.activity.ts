import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { MediaThumbnailService } from '@gitroom/nestjs-libraries/database/prisma/media/media.thumbnail.service';

@Injectable()
@Activity()
export class MediaActivity {
  constructor(
    private _mediaService: MediaService,
    private _thumbnails: MediaThumbnailService
  ) {}

  @ActivityMethod()
  async generateMediaThumbnail(mediaId: string) {
    return this._thumbnails.generate(mediaId);
  }

  // Returns the processor job id, or null when there is nothing to process
  @ActivityMethod()
  async submitMediaProcessing(mediaId: string) {
    return this._mediaService.submitProcessing(mediaId);
  }

  // Returns true once the media record is final (ready or failed)
  @ActivityMethod()
  async checkMediaProcessing(mediaId: string, jobId: string) {
    return this._mediaService.checkProcessing(mediaId, jobId);
  }

  @ActivityMethod()
  async failMediaProcessing(mediaId: string, error: string) {
    return this._mediaService.failProcessing(mediaId, error);
  }
}
