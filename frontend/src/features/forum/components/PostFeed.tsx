import { useEffect, useState } from 'react'

import { deleteForumPost, getForumPosts } from '../api/forumApi'
import type { ForumPostResponseDto } from '../types'
import { PostCard } from './PostCard'

interface PostFeedProps {
  reloadKey?: number
  tagFilter?: string
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unable to load forum posts.'

export function PostFeed({ reloadKey = 0, tagFilter }: PostFeedProps = {}) {
  const [posts, setPosts] = useState<ForumPostResponseDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadPosts = async () => {
      setIsLoading(true)
      setLoadError(null)
      setDeleteError(null)

      try {
        const response = await getForumPosts(tagFilter)
        if (isMounted) {
          setPosts(response)
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(getErrorMessage(error))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadPosts()

    return () => {
      isMounted = false
    }
  }, [reloadKey, tagFilter])

  const handleDelete = async (postId: number) => {
    setDeletingPostId(postId)
    setDeleteError(null)

    try {
      await deleteForumPost(postId)
      setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId))
    } catch (error) {
      setDeleteError(getErrorMessage(error))
    } finally {
      setDeletingPostId(null)
    }
  }

  const handlePostUpdated = (updatedPost: ForumPostResponseDto) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) => (post.id === updatedPost.id ? updatedPost : post)),
    )
  }

  return (
    <section className="space-y-5" aria-labelledby="forum-feed-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="forum-feed-heading" className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
            Latest posts
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            Browse the most recent discussions and join any thread below.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
          Loading posts…
        </div>
      ) : null}

      {!isLoading && loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {loadError}
        </div>
      ) : null}

      {!isLoading && !loadError && deleteError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {deleteError}
        </div>
      ) : null}

      {!isLoading && !loadError && posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-8 text-sm text-slate-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
          <strong className="block text-base font-semibold text-slate-900 dark:text-zinc-100">No posts yet.</strong>
          <span className="mt-1 block">Start the discussion.</span>
        </div>
      ) : null}

      <div className="space-y-4" aria-live="polite">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            deleting={deletingPostId === post.id}
            onDelete={handleDelete}
            onUpdated={handlePostUpdated}
          />
        ))}
      </div>
    </section>
  )
}

