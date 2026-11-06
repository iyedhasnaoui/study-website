import { useEffect, useState } from 'react'
import { TagFilterFields } from '../../components/TagFilterFields'
import { getTags, TAGS_UPDATED_EVENT } from '../../features/zitouna/api'
import type { ZitounaTag } from '../../features/zitouna/types'
import { PostFeed } from './components/PostFeed'
import '../../features/zitouna/zitouna.css'

interface ForumFeedPageProps {
    onCreateNew: () => void
    onOpenPost?: (postId: number) => void
}

export function ForumFeedPage({ onCreateNew, onOpenPost }: ForumFeedPageProps) {
    const [reloadKey, setReloadKey] = useState(0)
    const [searchDraft, setSearchDraft] = useState('')
    const [activeSearch, setActiveSearch] = useState<string | undefined>()
    const [tags, setTags] = useState<ZitounaTag[]>([])
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])

    useEffect(() => {
        const loadTags = () => getTags().then(setTags).catch(() => {})
        loadTags()
        window.addEventListener(TAGS_UPDATED_EVENT, loadTags)
        return () => window.removeEventListener(TAGS_UPDATED_EVENT, loadTags)
    }, [])

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <section className="zitouna-workspace">
                <aside className="filter-panel">
                    <div className="filter-panel__heading">
                        <span>Filters</span>
                        {selectedTagIds.length > 0 ? (
                            <button type="button" onClick={() => setSelectedTagIds([])}>Clear</button>
                        ) : null}
                    </div>
                    <TagFilterFields tags={tags} selectedTagIds={selectedTagIds} onChange={setSelectedTagIds}/>
                </aside>

                <div className="discovery-panel">
                    <header className="materials-heading">
                        <div>
                            <p className="eyebrow">Community discussions</p>
                            <h2>Forum</h2>
                            <p>Browse current conversations, open a thread, and jump into the replies.</p>
                        </div>
                        <button className="button button--gold" type="button" onClick={onCreateNew}>
                            New post
                        </button>
                    </header>

                    <form
                        className="zitouna-search"
                        onSubmit={(event) => {
                            event.preventDefault()
                            setActiveSearch(searchDraft.trim() || undefined)
                            setReloadKey((k) => k + 1)
                        }}
                    >
                        <span aria-hidden="true">⌕</span>
                        <input
                            type="text"
                            value={searchDraft}
                            onChange={(event) => setSearchDraft(event.target.value)}
                            placeholder="Search by post title..."
                        />
                        <button type="submit">Search</button>
                    </form>

                    {activeSearch ? (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-sm text-slate-500 dark:text-zinc-400">Search: {activeSearch}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchDraft('')
                                    setActiveSearch(undefined)
                                    setReloadKey((k) => k + 1)
                                }}
                                className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400"
                            >
                                Clear
                            </button>
                        </div>
                    ) : null}

                    <PostFeed
                        reloadKey={reloadKey}
                        query={activeSearch}
                        tagIds={selectedTagIds.length > 0 ? selectedTagIds : undefined}
                        onOpenPost={onOpenPost}
                    />
                </div>
            </section>
        </main>
    )
}