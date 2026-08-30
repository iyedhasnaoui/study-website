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

  return (
    <section className="forum-panel forum-panel--feed" aria-labelledby="forum-feed-heading">
      <h2 id="forum-feed-heading">Latest posts</h2>

      {isLoading ? <div className="forum-state">Loading…</div> : null}

      {!isLoading && loadError ? <div className="forum-state forum-state--error">{loadError}</div> : null}

      {!isLoading && !loadError && deleteError ? (
        <div className="forum-state forum-state--error">{deleteError}</div>
      ) : null}

      {!isLoading && !loadError && posts.length === 0 ? (
        <div className="forum-state forum-state--empty">
          <strong>No posts yet.</strong>
          <span>Start the discussion.</span>
        </div>
      ) : null}

      <div className="forum-feed" aria-live="polite">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            deleting={deletingPostId === post.id}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </section>
  )
}

