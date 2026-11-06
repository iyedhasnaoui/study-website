import { useEffect, useState } from 'react'

import { getApiErrorMessage } from '../../lib/apiClient'
import { getForumPostById } from './api/forumApi'
import { AttachmentGallery } from './components/AttachmentGallery'
import { PostContent } from './components/PostContent'
import { ReplyList } from './components/ReplyList'
import type { ForumPostResponseDto } from './types'
import './forum.css'

interface ForumPostPageProps {
  postId: number
  onBack: () => void
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const formatDateTime = (value: string | null): string => {
  if (!value) return 'Unknown'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed)
}

export function ForumPostPage({ postId, onBack }: ForumPostPageProps) {
  const [post, setPost] = useState<ForumPostResponseDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadPost = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getForumPostById(postId)
        if (isMounted) setPost(data)
      } catch (err) {
        if (isMounted) setError(getApiErrorMessage(err, 'Unable to load this post.'))
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadPost()
    return () => {
      isMounted = false
    }
  }, [postId])

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="zitouna-workspace zitouna-workspace--single">
        <div className="discovery-panel">
          <button
            type="button"
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400"
          >
            ← Back to Forum
          </button>

          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
              Loading post…
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </div>
          ) : null}

          {post ? (
            <article className="rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950/80">
              <div className="flex gap-6">
                {/* Left column — Author info */}
                <div className="flex shrink-0 flex-col items-center gap-2">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                    {post.authorUsername ? post.authorUsername.slice(0, 1).toUpperCase() : '?'}
                  </span>
                  <span className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                    {post.authorUsername ?? 'Unknown author'}
                  </span>
                </div>

                {/* Right column — Post content */}
                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
                      {post.title}
                    </h1>
                    <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                      Posted {formatDateTime(post.createdAt)}
                      {post.updatedAt && post.updatedAt !== post.createdAt
                        ? ` · Updated ${formatDateTime(post.updatedAt)}`
                        : ''}
                    </p>
                  </div>

                  <PostContent key={`${post.id}:${post.content}`} content={post.content} />

                  <AttachmentGallery attachments={post.attachments} />

                  <div className="flex flex-wrap items-center gap-2">
                    {post.tags.length > 0 ? (
                      post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-200"
                        >
                          #{tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400 dark:text-zinc-500">No tags</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Replies section */}
              <div className="mt-6 border-t border-gray-200 pt-4 dark:border-zinc-800">
                <ReplyList postId={post.id} />
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </main>
  )
}
