# Upload regression tests

Run from the repository root (Node 22):

```sh
pnpm exec vitest run --config tests/uploads/vitest.config.ts
```

These tests call the production R2 signing functions with dummy credentials.
They do not contact Cloudflare or use production accounts or databases. The
HTTP test sends a real MP4 to a local endpoint that enforces its checksum;
it does not emulate AWS signature authentication.

`fixtures/video.mp4` is a generated, silent, one-second blue frame (64 × 64).
Its CRC32 in base64 is `Ye4aAA==`.

`fixtures/iphone.mov` is a generated, silent, one-second blue frame (64 × 96),
encoded as H.264 in a QuickTime container (`video/quicktime`). It contains no
user media. The uploader test runs the production React hook and Uppy
preprocessors with no converter configured. Storage tests exercise real byte
sniffing, multipart completion, buffered uploads, and streaming uploads to local
storage and R2 (with only SDK network calls mocked). They cover uppercase MOV
names, ISO MP4-branded MOV files, and rejection/cleanup of disguised content.

The AWS SDK defaults to `WHEN_SUPPORTED` checksum calculation. When signing an
`UploadPartCommand` without a body, that generates `x-amz-checksum-crc32=AAAAAA==`
(the checksum of zero bytes). Uppy subsequently sends the actual video bytes,
which do not match. `WHEN_REQUIRED` avoids signing an optional empty-body
checksum. Signed authentication, part ETags, and content-type validation remain
in place.

Local browser verification also exercised the production Uppy helper and R2
upload handlers against an isolated, in-memory storage emulator: the old setting
failed with `BadDigest`; the fixed setting uploaded a small MP4, a 12 MiB MP4
in three parts, and a PNG successfully. This does not verify the live R2 bucket,
production deployment, authentication, or database persistence.

Preview regressions render the production media-library component and shared
post preview. They check MOV video cards, image/video picker filtering, existing
MP4/image rendering, and URL classification without relying on query strings.
Attachment DTO tests verify that uploaded MOV files can be used in posts while
unsupported extensions and configured upload-domain restrictions remain enforced.
Native video playback still depends on the browser supporting the file's codec;
these checks do not transcode HEVC videos.

Social-publishing regressions invoke the real provider methods with outgoing
platform requests intercepted: TikTok video initialization and QuickTime part
bytes, TikTok Business video requests, Instagram Reels parameters, and YouTube
resumable-upload MIME types. A validation matrix checks MOV against the existing
video restrictions, including image-only services. These tests do not publish
live social posts and do not guarantee every codec/profile is accepted by every
platform.
