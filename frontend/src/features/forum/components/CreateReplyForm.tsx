import { useState, type FormEvent } from 'react'

import { createReply } from '../api/forumApi'
import type { ForumReplyResponseDto } from '../types'

interface CreateReplyFormProps {
  postId: number
  onCreated: (reply: ForumReplyResponseDto) => void
}

const REPLY_CONTENT_MAX_LENGTH = 5000

export function CreateReplyForm({ postId, onCreated }: CreateReplyFormProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedContent = content.trim()
    if (!trimmedContent) {
      setError('Reply content cannot be empty.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const reply = await createReply(postId, { content: trimmedContent })
      setContent('')
      onCreated(reply)
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to post reply.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={handleSubmit} noValidate>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">Write a reply</span>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={4}
          maxLength={REPLY_CONTENT_MAX_LENGTH}
          placeholder="Share your thoughts..."
          className="min-h-28 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-violet-400 dark:focus:ring-violet-500/20"
        />
      </label>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-full bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Posting…' : 'Post reply'}
        </button>
      </div>
    </form>
  )
}
