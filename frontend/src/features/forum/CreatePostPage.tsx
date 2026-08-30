import { createForumPost } from './api/forumApi'
import { CreatePostForm } from './components/CreatePostForm'
import type { ForumPostCreateDto } from './types'

interface CreatePostPageProps {
  onBackToFeed: () => void
  onCreated: () => void
}

export function CreatePostPage({ onBackToFeed, onCreated }: CreatePostPageProps) {
  const handleCreate = async (payload: ForumPostCreateDto) => {
    await createForumPost(payload)
    onCreated()
  }

  return (
    <main className="forum-page">
      <section className="forum-page__hero">
        <div>
          <p className="forum-kicker">Forum</p>
          <h1>New post</h1>
        </div>

        <button type="button" className="forum-button forum-button--ghost" onClick={onBackToFeed}>
          Back to feed
        </button>
      </section>

      <CreatePostForm onCreate={handleCreate} />
    </main>
  )
}

