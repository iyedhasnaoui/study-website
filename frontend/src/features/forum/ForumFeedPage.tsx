import { PostFeed } from './components/PostFeed'

interface ForumFeedPageProps {
  onCreateNew: () => void
}

export function ForumFeedPage({ onCreateNew }: ForumFeedPageProps) {
  return (
    <main className="forum-page">
      <section className="forum-page__hero">
        <div>
          <p className="forum-kicker">Forum</p>
          <h1>Latest posts</h1>
        </div>

        <button type="button" className="forum-button" onClick={onCreateNew}>
          New post
        </button>
      </section>

      <PostFeed reloadKey={0} />
    </main>
  )
}


