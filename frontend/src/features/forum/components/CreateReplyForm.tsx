import { useState, type FormEvent } from 'react'

import { useAuth } from '../../../auth/AuthContext'
import { createReply } from '../api/forumApi'
import type { ForumReplyResponseDto } from '../types'
import { MediaComposer } from './MediaComposer'
import { getApiErrorMessage } from '../../../lib/apiClient'

interface CreateReplyFormProps {
  postId: number
  onCreated: (reply: ForumReplyResponseDto) => void
}

const REPLY_CONTENT_MAX_LENGTH = 5000

export function CreateReplyForm({ postId, onCreated }: CreateReplyFormProps) {
  const { session } = useAuth()
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedContent = content.trim()
    if (!trimmedContent && files.length === 0) {
      setError('Write a reply or add an audio, video, PDF, or voice recording.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const reply = await createReply(postId, { content: trimmedContent }, undefined, files)
      setContent('')
      setFiles([])
      onCreated(reply)
    } catch (submissionError) {
      setError(getApiErrorMessage(submissionError, 'Unable to post reply.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!session) {
    return (
      <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
        Sign in from the navigation to add your reply.
      </p>
    )
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={handleSubmit} noValidate>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">Write or record a reply</span>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={4}
          maxLength={REPLY_CONTENT_MAX_LENGTH}
          placeholder="Share your thoughts, or leave this empty and record a voice reply"
          className="min-h-28 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-amber-400 dark:focus:ring-amber-500/20"
        />
      </label>

      <MediaComposer files={files} onFilesChange={setFiles} disabled={isSubmitting} compact />

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-full bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Posting…' : 'Post reply'}
        </button>
      </div>
    </form>
  )
}
