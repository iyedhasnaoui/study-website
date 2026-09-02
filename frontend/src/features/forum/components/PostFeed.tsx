import { useEffect, useMemo, useState } from 'react'

import { deleteForumPost, getForumPosts } from '../api/forumApi'
import type { ForumPostResponseDto } from '../types'
import { PostCard } from './PostCard'

interface PostFeedProps {
  reloadKey?: number
  tagFilter?: string
  selectedTopicId?: number | null
  searchQuery?: string
  sortBy?: 'latest' | 'oldest'
}

const getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : 'Unable to load forum posts.'

export function PostFeed({
                           reloadKey = 0,
                           tagFilter,
                           selectedTopicId = null,
                           searchQuery = '',
                           sortBy = 'latest',
                         }: PostFeedProps) {
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

  // Filter and sort the posts based on the top bar and category selection
  const filteredPosts = useMemo(() => {
    return posts
        .filter((post) => {
          const matchesTopic =
              selectedTopicId === null || post.topicId === selectedTopicId
          const matchesSearch =
              searchQuery.trim() === '' ||
              post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              post.content.toLowerCase().includes(searchQuery.toLowerCase())
          return matchesTopic && matchesSearch
        })
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return sortBy === 'latest' ? dateB - dateA : dateA - dateB
        })
  }, [posts, selectedTopicId, searchQuery, sortBy])

  return (
      <section className="space-y-4" aria-labelledby="forum-feed-heading">
        <h2 id="forum-feed-heading" className="sr-only">
          Forum Feed
        </h2>

        {isLoading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
              Loading discussions…
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

        {!isLoading && !loadError && filteredPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-8 text-sm text-slate-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
              <strong className="block text-base font-semibold text-slate-900 dark:text-zinc-100">
                No discussions found.
              </strong>
              <span className="mt-1 block">Try adjusting your filters or create a new post.</span>
            </div>
        ) : null}

        <div className="space-y-4" aria-live="polite">
          {filteredPosts.map((post) => (
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