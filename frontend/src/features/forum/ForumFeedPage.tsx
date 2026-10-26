import { useState, type FormEvent } from 'react'
import { TagAutocomplete, type TagItem } from '../../components/TagAutocomplete'
import { PostFeed } from './components/PostFeed'

interface ForumFeedPageProps {
    onCreateNew: () => void
}

export function ForumFeedPage({ onCreateNew }: ForumFeedPageProps) {
    const [reloadKey, setReloadKey] = useState(0)
    const [selectedTags, setSelectedTags] = useState<TagItem[]>([])
    const [activeTagFilter, setActiveTagFilter] = useState<string | undefined>(undefined)

    const applyTagFilter = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        // Use the first selected tag name, or undefined if no tags are selected
        const primaryTag = selectedTags.length > 0 ? selectedTags[0].name : undefined
        setActiveTagFilter(primaryTag)
        setReloadKey((current) => current + 1)
    }

    const clearTagFilter = () => {
        setSelectedTags([])
        setActiveTagFilter(undefined)
        setReloadKey((current) => current + 1)
    }

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

            <div className="mb-6">
                <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={applyTagFilter}>
                    <div className="flex-1">
                        <TagAutocomplete
                            selectedTags={selectedTags}
                            onChange={setSelectedTags}
                            placeholder="Select tag to filter..."
                            label=""
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                        >
                            Filter
                        </button>
                        {activeTagFilter || selectedTags.length > 0 ? (
                            <button
                                type="button"
                                onClick={clearTagFilter}
                                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                            >
                                Clear
                            </button>
                        ) : null}
                    </div>
                </form>
            </div>

            <PostFeed reloadKey={reloadKey} tagFilter={activeTagFilter} />
        </main>
    )
}