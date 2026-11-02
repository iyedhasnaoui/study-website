import {useEffect, useMemo, useState} from 'react'

import {useAuth} from '../../auth/AuthContext'
import {getTags, TAGS_UPDATED_EVENT} from '../../features/zitouna/api'
import type {ZitounaTag} from '../../features/zitouna/types'
import {CreateRoadmapForm} from './components/CreateRoadmapForm'
import {RoadmapFeed} from './components/RoadmapFeed'

const fieldLabels: Record<string, string> = {
    INSTITUTION: 'Institution',
    PROGRAM: 'Program / position',
    TOPIC: 'Topic',
    SUBTOPIC: 'Subtopic',
}

export interface RoadmapFeedPageProps {
    onOpenRoadmap: (roadmapId: number) => void
}

export function RoadmapFeedPage({onOpenRoadmap}: RoadmapFeedPageProps) {
    const {session, canContribute} = useAuth()
    const [reloadKey, setReloadKey] = useState(0)
    const [searchDraft, setSearchDraft] = useState('')
    const [activeSearch, setActiveSearch] = useState<string | undefined>(undefined)
    const [notice, setNotice] = useState<string | null>(null)
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

    const handleCreated = (roadmapId: number) => {
        setReloadKey((value) => value + 1)
        onOpenRoadmap(roadmapId)
        setNotice('Your roadmap has been submitted and is currently in the admin moderation queue.')
    }

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <section
                className="mb-8 rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-300">
                            Study Roadmaps
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
                            Learning paths
                        </h1>
                        <p className="max-w-2xl text-sm text-slate-500 dark:text-zinc-400">
                            Explore curated study plans as interactive graphs, and build your own.
                        </p>
                    </div>
                </div>
            </section>
            {notice ? (
                <div
                    className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                    {notice}
                </div>
            ) : null}

            <div className="grid gap-8 lg:grid-cols-3">
                <div className="space-y-6 lg:sticky lg:top-28">
                    {session && canContribute ? (
                        <CreateRoadmapForm onCreated={handleCreated}/>
                    ) : (
                        <section
                            className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Members
                                contribute</p>
                            <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-zinc-100">
                                {session ? 'Contributor access needed' : 'Sign in to create a roadmap'}
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-300">
                                {session
                                    ? 'Your account can browse every roadmap. Ask an administrator for contributor access to publish your own.'
                                    : 'Use the sign-in button above, then turn what you learned into a path others can follow.'}
                            </p>
                        </section>
                    )}

                    {/* Tag Filters */}
                    <section className="rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-400">
                                Tag filters
                            </h3>
                            {selectedTagIds.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => setSelectedTagIds([])}
                                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400"
                                >
                                    Clear
                                </button>
                            ) : null}
                        </div>
                        {[...groupedTags.entries()].map(([field, values]) => (
                            <fieldset key={field} className="mb-3">
                                <legend className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                                    {fieldLabels[field] || field}
                                </legend>
                                <div className="mt-1 space-y-1">
                                    {values.map((tag) => (
                                        <label key={tag.id} className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={selectedTagIds.includes(tag.id)}
                                                onChange={() => setSelectedTagIds((current) =>
                                                    current.includes(tag.id)
                                                        ? current.filter((id) => id !== tag.id)
                                                        : [...current, tag.id]
                                                )}
                                                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
                                            />
                                            <span className="text-slate-700 dark:text-zinc-300">{tag.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        ))}
                    </section>
                </div>

                <div className="space-y-6 lg:col-span-2">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
                                Roadmaps
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-zinc-400">{subtitle}</p>
                        </div>

                        <form
                            className="flex flex-col gap-3 sm:flex-row sm:items-end"
                            onSubmit={(event) => {
                                event.preventDefault()
                                setActiveSearch(searchDraft.trim() || undefined)
                                setReloadKey((value) => value + 1)
                            }}
                        >
                            <input
                                type="text"
                                value={searchDraft}
                                onChange={(event) => setSearchDraft(event.target.value)}
                                placeholder="Search roadmap title or description..."
                                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-amber-400 dark:focus:ring-amber-500/20"
                            />
                            <button
                                type="submit"
                                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                            >
                                Search
                            </button>
                            {activeSearch ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchDraft('')
                                        setActiveSearch(undefined)
                                        setReloadKey((value) => value + 1)
                                    }}
                                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                                >
                                    Clear
                                </button>
                            ) : null}
                        </form>
                    </div>

                    <RoadmapFeed
                        reloadKey={reloadKey}
                        searchFilter={activeSearch}
                        tagIds={selectedTagIds.length > 0 ? selectedTagIds : undefined}
                        onSelectRoadmap={onOpenRoadmap}
                    />
                </div>
            </div>
        </main>
    )
}
