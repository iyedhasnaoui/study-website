# Forum multimedia contributions

Forum posts and replies can contain written text, uploaded media, or both. A contribution may contain up to five files, with a 50 MB limit per file and a 200 MB total request limit.

## Supported media

- PDF documents
- Audio: MP3, WAV, M4A, AAC, OGG, and WebM
- Video: MP4, WebM, MOV, and M4V
- Voice experiences recorded directly in the browser through `MediaRecorder`

## API shape

Text-only clients can continue sending JSON to `POST /api/forum/posts` and `POST /api/forum/posts/{postId}/replies`.

For media, send `multipart/form-data` to the same endpoint:

- `payload`: an `application/json` part containing the existing post or reply DTO
- `files`: one or more media parts

Responses contain an `attachments` array. Each item includes its type, MIME type, original filename, size, and a `contentUrl`. The media bytes are served by `GET /api/forum/attachments/{attachmentId}/content`.

## Responsibilities

- `ForumAttachmentStorageService` validates filenames, extensions, MIME categories, PDF signatures, and size before writing to an opaque UUID filename.
- `ForumAttachmentService` associates stored media with a post or reply and removes physical files when the parent contribution is deleted.
- `ForumAttachmentController` streams files inline so the frontend can use native audio and video players.
- `MediaComposer` owns file selection, client-side limits, microphone permission, recording, and the pending-file list.
- `AttachmentGallery` renders audio players, video players, and PDF download cards inside the forum feed.

Uploaded files are stored under `uploads/forum` by default. Set `app.upload.forum-directory` to use a different persistent directory in deployment.
