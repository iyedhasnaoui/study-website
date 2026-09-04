import { useMemo, useState, type FormEvent } from 'react'

import { createForumPost } from './api/forumApi'
import { CreatePostForm } from './components/CreatePostForm'
import { PostFeed } from './components/PostFeed'
import type { ForumPostCreateDto } from './types'

export function ForumPage() {
  const [reloadKey, setReloadKey] = useState(0)
  const [tagDraft, setTagDraft] = useState('')
  const [activeTagFilter, setActiveTagFilter] = useState<string | undefined>(undefined)

  const feedSubtitle = useMemo(() => {
    if (!activeTagFilter) {
      return 'Latest discussions'
    }

    return `Tag: #${activeTagFilter}`
  }, [activeTagFilter])

  const handleCreate = async (payload: ForumPostCreateDto, files: File[]) => {
    await createForumPost(payload, undefined, files)
    setReloadKey((current) => current + 1)
  }

  const applyTagFilter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setActiveTagFilter(tagDraft.trim() || undefined)
    setReloadKey((current) => current + 1)
  }

  const clearTagFilter = () => {
    setTagDraft('')
    setActiveTagFilter(undefined)
    setReloadKey((current) => current + 1)
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-8 rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-300">
            Forum
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
            Discussions
          </h1>
          <p className="max-w-2xl text-sm text-slate-500 dark:text-zinc-400">
            Browse current conversations, open a thread, and jump into the replies.
          </p>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:sticky lg:top-8">
          <CreatePostForm onCreate={handleCreate} />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">Posts</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400">{feedSubtitle}</p>
            </div>

            <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={applyTagFilter}>
              <input
                type="text"
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                placeholder="Filter by tag..."
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-amber-400 dark:focus:ring-amber-500/20"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              >
                Filter
              </button>
              {activeTagFilter ? (
                <button
                  type="button"
                  onClick={clearTagFilter}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  Clear
                </button>
              ) : null}
            </form>
          </div>

          <PostFeed reloadKey={reloadKey} tagFilter={activeTagFilter} />
        </div>
      </div>
    </main>
  )
}


