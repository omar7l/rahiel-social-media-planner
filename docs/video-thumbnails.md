# Video thumbnails

The media library can display JPEG thumbnails for MOV and MP4 videos even when
the browser cannot decode the original codec, such as HEVC. Videos keep their
original storage key, bytes, filename, readiness, and publishing URL. This does
not add conversion or make unsupported codecs playable in a browser or social API.

New uploads queue a background thumbnail job. Opening the media library also
queues videos without covers on the visible page, so existing uploads are filled
in gradually. The page refreshes missing thumbnails for up to two minutes; later
visits can pick up slower jobs. Existing and newly selected custom covers win
over automatically generated thumbnails.

The existing Temporal worker runs an activity-only `video-thumbnails` queue:

- One thumbnail activity at a time per worker; at most one new activity per
  second across the queue. Use `EXCLUDE_QUEUE=video-thumbnails` on workers that
  should not decode video.
- FFmpeg decodes one frame with two decoder threads and a single filter/output
  thread. The JPEG fits within 480 by 480 pixels.
- Remote input streams to a temporary file with a 1 GiB limit and 90-second
  download deadline. Local input must resolve inside the uploads directory.
  FFmpeg has a 30-second deadline, restricted local protocols, and a 2 MiB output
  limit. Temporary files are removed on success or failure.
- Jobs make at most two attempts. Queue or decoding failures do not mark the original upload
  as failed. A one-hour Redis claim prevents repeated page requests from queuing
  the same source repeatedly.
- Database writes change only an empty `Media.thumbnail` and require the same
  organization, source URL, and undeleted media. An unused generated JPEG is
  removed if a manual cover or changed source wins the race.

The Rahiel Docker image includes FFmpeg. Other installations must install it on
their thumbnail workers, optionally setting `FFMPEG_PATH`. Set
`DISABLE_VIDEO_THUMBNAILS=true` in both backend and worker to disable generation.
No database schema or paid processor is required.

Measured on the six-core Rahiel server, decoding a thumbnail from generated 4K
HEVC took 0.21 seconds and about 200 MiB peak memory. Downloading a stored video
adds network time and temporary disk use; real footage varies. This feature
preserves original publishing formats, so platforms requiring MP4/H.264 still
need a compatible export.
