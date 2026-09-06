import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../../auth/AuthContext'
import { deleteReply, updateReply } from '../api/forumApi'
import type { ForumReplyResponseDto, ForumReplyUpdateDto } from '../types'
import { AttachmentGallery } from './AttachmentGallery'

interface ReplyItemProps {
  reply: ForumReplyResponseDto
  onUpdated: (reply: ForumReplyResponseDto) => void
  onDeleted: (replyId: number) => void
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const REPLY_CONTENT_MAX_LENGTH = 5000

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

export function ReplyItem({ reply, onUpdated, onDeleted }: ReplyItemProps) {
  const { session } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [draftContent, setDraftContent] = useState(reply.content)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraftContent(reply.content)
  }, [reply.content, reply.id])

  const authorLabel = useMemo(() => {
    if (reply.authorUsername) {
      return reply.authorId != null ? `${reply.authorUsername} · #${reply.authorId}` : reply.authorUsername
    }

    return reply.authorId != null ? `User #${reply.authorId}` : 'Unknown author'
  }, [reply.authorId, reply.authorUsername])

  const handleStartEditing = () => {
    setError(null)
    setDraftContent(reply.content)
    setIsEditing(true)
  }

  const handleCancelEditing = () => {
    setDraftContent(reply.content)
    setIsEditing(false)
    setError(null)
  }

  const handleSave = async () => {
    const trimmedContent = draftContent.trim()
    if (!trimmedContent && !reply.attachments?.length) {
      setError('Keep some text or at least one media attachment.')
      return
    }

    if (reply.postId == null) {
      setError('Unable to update this reply because the post reference is missing.')
      return
    }

    const payload: ForumReplyUpdateDto = { content: trimmedContent }

    setIsSaving(true)
    setError(null)

    try {
      const updated = await updateReply(reply.postId, reply.id, payload)
      onUpdated(updated)
      setIsEditing(false)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update reply.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (reply.postId == null) {
      setError('Unable to delete this reply because the post reference is missing.')
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      await deleteReply(reply.postId, reply.id)
      onDeleted(reply.id)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete reply.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <article className="rounded-2xl border-l-4 border-amber-300 bg-white/80 px-4 py-4 shadow-sm ring-1 ring-slate-200/80 transition dark:border-amber-500/40 dark:bg-zinc-950/60 dark:ring-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">Reply</p>
          <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">{authorLabel}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isEditing || session?.user.id !== reply.authorId ? null : (
            <button
              type="button"
              onClick={handleStartEditing}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-amber-300 hover:text-amber-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-amber-500/50 dark:hover:text-amber-200"
            >
              Edit
            </button>
          )}
          {session?.user.id === reply.authorId ? <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/70 dark:text-rose-300 dark:hover:bg-rose-950/40"
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button> : null}
        </div>
      </div>

      <div className="mt-3">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={draftContent}
              onChange={(event) => setDraftContent(event.target.value)}
              rows={4}
              maxLength={REPLY_CONTENT_MAX_LENGTH}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-amber-400 dark:focus:ring-amber-500/20"
            />

            {error ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                {error}
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-2">
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
                className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {reply.content ? (
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-zinc-300">{reply.content}</p>
            ) : null}

            <AttachmentGallery attachments={reply.attachments} compact />

            {error ? (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                {error}
              </p>
            ) : null}
          </>
        )}
      </div>

      <footer className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
        <span>Posted {formatDateTime(reply.createdAt)}</span>
        {reply.updatedAt && reply.updatedAt !== reply.createdAt ? (
          <span>Updated {formatDateTime(reply.updatedAt)}</span>
        ) : null}
      </footer>
    </article>
  )
}
