import { PostFeed } from './components/PostFeed'

interface ForumFeedPageProps {
  onCreateNew: () => void
}

export function ForumFeedPage({ onCreateNew }: ForumFeedPageProps) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-8 rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-300">
              Forum
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
              Latest posts
            </h1>
            <p className="max-w-2xl text-sm text-slate-500 dark:text-zinc-400">
              Browse current conversations, open a thread, and jump into the replies.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500"
            onClick={onCreateNew}
          >
            New post
          </button>
        </div>
      </section>

      <PostFeed reloadKey={0} />
    </main>
  )
}


