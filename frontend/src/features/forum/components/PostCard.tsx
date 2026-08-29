import type { ForumPostResponseDto } from '../types'

interface PostCardProps {
  post: ForumPostResponseDto
  onDelete?: (postId: number) => void | Promise<void>
  deleting?: boolean
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return 'Unknown'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return dateFormatter.format(parsed)
}

export function PostCard({ post, onDelete, deleting = false }: PostCardProps) {
  const authorLabel = post.authorUsername
    ? post.authorId != null
      ? `${post.authorUsername} · #${post.authorId}`
      : post.authorUsername
    : post.authorId != null
      ? `User #${post.authorId}`
      : 'Unknown author'

  return (
    <article className="forum-post-card">
      <header className="forum-post-card__header">
        <div className="forum-post-card__heading-group">
          <p className="forum-post-card__meta">{authorLabel}</p>
          <h2 className="forum-post-card__title">{post.title}</h2>
        </div>

        {onDelete ? (
          <button
            type="button"
            className="forum-button forum-button--ghost"
            onClick={() => onDelete(post.id)}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        ) : null}
      </header>

      <p className="forum-post-card__content">{post.content}</p>

      <div className="forum-post-card__tags">
        {post.tags.length > 0 ? (
          post.tags.map((tag) => (
            <span key={tag} className="forum-tag">
              #{tag}
            </span>
          ))
        ) : (
          <span className="forum-post-card__empty-tags">No tags</span>
        )}
      </div>

      <footer className="forum-post-card__footer">
        <span>Created: {formatDateTime(post.createdAt)}</span>
        <span>Updated: {formatDateTime(post.updatedAt)}</span>
      </footer>
    </article>
  )
}

