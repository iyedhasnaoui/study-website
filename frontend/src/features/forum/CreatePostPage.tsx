import { createForumPost } from './api/forumApi'
import { CreatePostForm } from './components/CreatePostForm'
import type { ForumPostCreateDto } from './types'

interface CreatePostPageProps {
  onBackToFeed: () => void
  onCreated: () => void
}

export function CreatePostPage({ onBackToFeed, onCreated }: CreatePostPageProps) {
  const handleCreate = async (payload: ForumPostCreateDto, files: File[]) => {
    await createForumPost(payload, undefined, files)
    onCreated()
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-8 rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-300">
              Forum
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">New post</h1>
            <p className="max-w-2xl text-sm text-slate-500 dark:text-zinc-400">
              Compose a new discussion topic for the community.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-amber-500/50 dark:hover:text-amber-200"
            onClick={onBackToFeed}
          >
            Back to feed
          </button>
        </div>
      </section>

      <CreatePostForm onCreate={handleCreate} />
    </main>
  )
}

