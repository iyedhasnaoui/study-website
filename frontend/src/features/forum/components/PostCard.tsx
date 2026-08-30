import { useEffect, useMemo, useState } from 'react'

import { updatePost } from '../api/forumApi'
import type { ForumPostResponseDto, ForumPostUpdateDto } from '../types'
import { ReplyList } from './ReplyList'

interface PostCardProps {
  post: ForumPostResponseDto
  onDelete?: (postId: number) => void | Promise<void>
  onUpdated?: (post: ForumPostResponseDto) => void
  deleting?: boolean
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const POST_TITLE_MAX_LENGTH = 150
const POST_CONTENT_MAX_LENGTH = 10000

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

export function PostCard({ post, onDelete, onUpdated, deleting = false }: PostCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRepliesOpen, setIsRepliesOpen] = useState(false)
  const [draft, setDraft] = useState<ForumPostUpdateDto>({
    title: post.title,
    content: post.content,
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraft({
      title: post.title,
      content: post.content,
    })
    setIsEditing(false)
    setError(null)
  }, [post.content, post.id, post.title])

  const authorLabel = useMemo(() => {
    if (post.authorUsername) {
      return post.authorId != null ? `${post.authorUsername} · #${post.authorId}` : post.authorUsername
    }

    return post.authorId != null ? `User #${post.authorId}` : 'Unknown author'
  }, [post.authorId, post.authorUsername])

  const handleStartEditing = () => {
    setDraft({
      title: post.title,
      content: post.content,
    })
    setError(null)
    setIsEditing(true)
  }

  const handleCancelEditing = () => {
    setDraft({
      title: post.title,
      content: post.content,
    })
    setError(null)
    setIsEditing(false)
  }

  const handleSave = async () => {
    const nextTitle = draft.title?.trim() ?? ''
    const nextContent = draft.content?.trim() ?? ''

    if (!nextTitle) {
      setError('Post title cannot be empty.')
      return
    }

    if (!nextContent) {
      setError('Post content cannot be empty.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const saved = await updatePost(post.id, {
        title: nextTitle,
        content: nextContent,
      })

      onUpdated?.(saved)
      setIsEditing(false)
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to update post.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <article className="rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">{authorLabel}</p>

          {isEditing ? (
            <div className="space-y-3 pt-1">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                  Title
                </span>
                <input
                  type="text"
                  value={draft.title ?? ''}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  maxLength={POST_TITLE_MAX_LENGTH}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-violet-400 dark:focus:ring-violet-500/20"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                  Content
                </span>
                <textarea
                  value={draft.content ?? ''}
                  onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
                  rows={8}
                  maxLength={POST_CONTENT_MAX_LENGTH}
                  className="min-h-40 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-violet-400 dark:focus:ring-violet-500/20"
                />
              </label>

              {error ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                  {error}
                </p>
              ) : null}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          ) : (
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
              {post.title}
            </h2>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isEditing ? (
            <button
              type="button"
              onClick={handleStartEditing}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-violet-300 hover:text-violet-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-violet-500/50 dark:hover:text-violet-200"
            >
              Edit
            </button>
          ) : null}

          {onDelete ? (
            <button
              type="button"
              className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/70 dark:text-rose-300 dark:hover:bg-rose-950/40"
              onClick={() => onDelete(post.id)}
              disabled={deleting || isSaving}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          ) : null}
        </div>
      </header>

      {!isEditing ? (
        <>
          <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-zinc-300">
            {post.content}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {post.tags.length > 0 ? (
              post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-200"
                >
                  #{tag}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-400 dark:text-zinc-500">No tags</span>
            )}
          </div>

          <footer className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
            <span>Posted {formatDateTime(post.createdAt)}</span>
            {post.updatedAt && post.updatedAt !== post.createdAt ? (
              <span>Updated {formatDateTime(post.updatedAt)}</span>
            ) : null}
          </footer>

          <div className="mt-6 border-t border-gray-200 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsRepliesOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-violet-500/50 dark:hover:text-violet-200"
            >
              <span>{isRepliesOpen ? 'Hide replies' : 'Show replies'}</span>
            </button>

            {isRepliesOpen ? <ReplyList postId={post.id} /> : null}
          </div>
        </>
      ) : null}
    </article>
  )
}

