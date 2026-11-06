import {useEffect, useState} from 'react'

import {useAuth} from '../../auth/AuthContext'
import {TagFilterFields} from '../../components/TagFilterFields'
import {getTags, TAGS_UPDATED_EVENT} from '../../features/zitouna/api'
import type {ZitounaTag} from '../../features/zitouna/types'
import {RoadmapFeed} from './components/RoadmapFeed'

export interface RoadmapFeedPageProps {
    onOpenRoadmap: (roadmapId: number) => void
    onOpenCreate: () => void
    sharedFilters?: {query?: string; tagIds: number[]}
    page?: number
    size?: number
    onTotalPages?: (totalPages: number) => void
}

export function RoadmapFeedPage({onOpenRoadmap, onOpenCreate, sharedFilters, page, size, onTotalPages}: RoadmapFeedPageProps) {
    const {session, canContribute} = useAuth()
    const [reloadKey, setReloadKey] = useState(0)
    const [searchDraft, setSearchDraft] = useState('')
    const [activeSearch, setActiveSearch] = useState<string | undefined>(undefined)
    const [tags, setTags] = useState<ZitounaTag[]>([])
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])

    useEffect(() => {
        const loadTags = () => getTags().then(setTags).catch(() => {})

        loadTags()
        window.addEventListener(TAGS_UPDATED_EVENT, loadTags)
        return () => window.removeEventListener(TAGS_UPDATED_EVENT, loadTags)
    }, [])

    const activeQuery = sharedFilters ? sharedFilters.query : activeSearch
    const activeTagIds = sharedFilters ? sharedFilters.tagIds : selectedTagIds

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

            {!canContribute ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Members contribute</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-300">
                      {session
                          ? 'Your account can browse every roadmap. Ask an administrator for contributor access to publish your own.'
                          : 'Use the sign-in button above, then turn what you learned into a path others can follow.'}
                  </p>
              </div>
            ) : null}
            <section className={`zitouna-workspace${sharedFilters ? ' zitouna-workspace--single' : ''}`}>
                {!sharedFilters ? (
                    <aside className="filter-panel">
                        <div className="filter-panel__heading">
                            <span>Filters</span>
                            {selectedTagIds.length > 0 ? (
                                <button type="button" onClick={() => setSelectedTagIds([])}>Clear</button>
                            ) : null}
                        </div>
                        <TagFilterFields tags={tags} selectedTagIds={selectedTagIds} onChange={setSelectedTagIds}/>
                    </aside>
                ) : null}

                <div className="discovery-panel">
                    <header className="materials-heading">
                        <div>
                            <p className="eyebrow">Study Roadmaps</p>
                            <h2>Learning paths</h2>
                            <p>Explore curated study plans as interactive graphs, and build your own.</p>
                        </div>
                        {canContribute ? (
                            <button className="button button--gold" type="button" onClick={onOpenCreate}>
                                Create roadmap
                            </button>
                        ) : null}
                    </header>

                    {!sharedFilters ? (
                        <form
                            className="zitouna-search"
                            onSubmit={(event) => {
                                event.preventDefault()
                                setActiveSearch(searchDraft.trim() || undefined)
                                setReloadKey((value) => value + 1)
                            }}
                        >
                            <span aria-hidden="true">⌕</span>
                            <input
                                type="text"
                                value={searchDraft}
                                onChange={(event) => setSearchDraft(event.target.value)}
                                placeholder="Search roadmap title or description..."
                            />
                            <button type="submit">Search</button>
                        </form>
                    ) : null}

                    {!sharedFilters && activeSearch ? (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-sm text-slate-500 dark:text-zinc-400">Search: {activeSearch}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchDraft('')
                                    setActiveSearch(undefined)
                                    setReloadKey((value) => value + 1)
                                }}
                                className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400"
                            >
                                Clear
                            </button>
                        </div>
                    ) : null}

                    <RoadmapFeed
                        reloadKey={reloadKey}
                        searchFilter={activeQuery}
                        tagIds={activeTagIds.length > 0 ? activeTagIds : undefined}
                        onSelectRoadmap={onOpenRoadmap}
                        page={page}
                        size={size}
                        onTotalPages={onTotalPages}
                    />
                </div>
            </section>
        </main>
    )
}
