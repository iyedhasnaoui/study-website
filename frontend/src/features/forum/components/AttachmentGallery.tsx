import { resolveApiUrl } from '../../../lib/apiClient'
import type { ForumAttachmentResponseDto } from '../types'

interface AttachmentGalleryProps {
  attachments?: ForumAttachmentResponseDto[] | null
  compact?: boolean
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentGallery({ attachments, compact = false }: AttachmentGalleryProps) {
  if (!attachments?.length) return null

  return (
    <div className={`attachment-gallery ${compact ? 'attachment-gallery--compact' : ''}`}>
      {attachments.map((attachment) => {
        const source = resolveApiUrl(attachment.contentUrl)
        if (attachment.type === 'AUDIO') {
          return (
            <figure className="attachment-card attachment-card--audio" key={attachment.id}>
              <figcaption><span>Voice / audio</span><strong>{attachment.filename}</strong></figcaption>
              <audio controls preload="metadata" src={source}>Your browser cannot play this audio.</audio>
              <small>{formatBytes(attachment.sizeBytes)}</small>
            </figure>
          )
        }
        if (attachment.type === 'VIDEO') {
          return (
            <figure className="attachment-card attachment-card--video" key={attachment.id}>
              <video controls preload="metadata" src={source}>Your browser cannot play this video.</video>
              <figcaption><strong>{attachment.filename}</strong><small>{formatBytes(attachment.sizeBytes)}</small></figcaption>
            </figure>
          )
        }
        return (
          <a className="attachment-card attachment-card--pdf" href={source} target="_blank" rel="noreferrer" key={attachment.id}>
            <span className="attachment-card__pdf-icon">PDF</span>
            <span><strong>{attachment.filename}</strong><small>{formatBytes(attachment.sizeBytes)} · Open document ↗</small></span>
          </a>
        )
      })}
    </div>
  )
}
