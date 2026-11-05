import {useEffect, useMemo, useState} from 'react'

import {useAuth} from '../../auth/AuthContext'
import {getTags, TAGS_UPDATED_EVENT} from '../../features/zitouna/api'
import type {ZitounaTag} from '../../features/zitouna/types'
import {RoadmapFeed} from './components/RoadmapFeed'

const fieldLabels: Record<string, string> = {
    INSTITUTION: 'Institution',
    PROGRAM: 'Program / position',
    TOPIC: 'Topic',
    SUBTOPIC: 'Subtopic',
}

export interface RoadmapFeedPageProps {
    onOpenRoadmap: (roadmapId: number) => void
    onOpenCreate: () => void
}

export function RoadmapFeedPage({onOpenRoadmap, onOpenCreate}: RoadmapFeedPageProps) {
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

    const groupedTags = useMemo(() => {
        const groups = new Map<string, ZitounaTag[]>()
        tags.forEach((tag) => groups.set(tag.field, [...(groups.get(tag.field) ?? []), tag]))
        return groups
    }, [tags])

    const subtitle = useMemo(() => {
        const parts: string[] = []
        if (activeSearch) parts.push(`Search: ${activeSearch}`)
        if (selectedTagIds.length > 0) parts.push(`${selectedTagIds.length} tag filter${selectedTagIds.length > 1 ? 's' : ''}`)
        return parts.length > 0 ? parts.join(' · ') : 'Browse study plans and learning paths'
    }, [activeSearch, selectedTagIds])

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
            <section className="zitouna-workspace">
                <aside className="filter-panel">
                    <div className="filter-panel__heading">
                        <span>Filters</span>
                        {selectedTagIds.length > 0 ? (
                            <button type="button" onClick={() => setSelectedTagIds([])}>Clear</button>
                        ) : null}
                    </div>
                    {[...groupedTags.entries()].map(([field, values]) => (
                        <fieldset key={field}>
                            <legend>{fieldLabels[field] || field}</legend>
                            {values.map((tag) => (
                                <label key={tag.id}>
                                    <input
                                        type="checkbox"
                                        checked={selectedTagIds.includes(tag.id)}
                                        onChange={() => setSelectedTagIds((current) =>
                                            current.includes(tag.id)
                                                ? current.filter((id) => id !== tag.id)
                                                : [...current, tag.id]
                                        )}
                                    />
                                    <span>{tag.name}</span>
                                </label>
                            ))}
                        </fieldset>
                    ))}
                </aside>

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

                    {activeSearch ? (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-sm text-slate-500 dark:text-zinc-400">{subtitle}</span>
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
                        searchFilter={activeSearch}
                        tagIds={selectedTagIds.length > 0 ? selectedTagIds : undefined}
                        onSelectRoadmap={onOpenRoadmap}
                    />
                </div>
            </section>
        </main>
    )
}
