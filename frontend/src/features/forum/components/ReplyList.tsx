import { useEffect, useState } from 'react'

import { getRepliesByPostId } from '../api/forumApi'
import type { ForumReplyResponseDto } from '../types'
import { CreateReplyForm } from './CreateReplyForm'
import { ReplyItem } from './ReplyItem'

interface ReplyListProps {
  postId: number
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unable to load replies.'

export function ReplyList({ postId }: ReplyListProps) {
  const [replies, setReplies] = useState<ForumReplyResponseDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadReplies = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await getRepliesByPostId(postId)
        if (isMounted) {
          setReplies(response)
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadReplies()

    return () => {
      isMounted = false
    }
  }, [postId])

  const handleCreated = (reply: ForumReplyResponseDto) => {
    setReplies((currentReplies) => [reply, ...currentReplies])
  }

  const handleUpdated = (updatedReply: ForumReplyResponseDto) => {
    setReplies((currentReplies) =>
      currentReplies.map((reply) => (reply.id === updatedReply.id ? updatedReply : reply)),
    )
  }

  const handleDeleted = (replyId: number) => {
    setReplies((currentReplies) => currentReplies.filter((reply) => reply.id !== replyId))
  }

  return (
    <section className="mt-5 rounded-2xl border border-gray-200 bg-slate-50/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-zinc-100">Replies</h3>
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            Join the conversation beneath this post.
          </p>
        </div>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-zinc-950 dark:text-zinc-300 dark:ring-zinc-800">
          {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
        </span>
      </div>

      <CreateReplyForm postId={postId} onCreated={handleCreated} />

      {isLoading ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
          Loading replies…
        </div>
      ) : null}

      {!isLoading && error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {!isLoading && !error && replies.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
          No replies yet. Be the first to respond.
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {replies.map((reply) => (
          <ReplyItem key={reply.id} reply={reply} onUpdated={handleUpdated} onDeleted={handleDeleted} />
        ))}
      </div>
    </section>
  )
}
