import { useMemo, useState } from 'react'

import { CreateRoadmapForm } from './components/CreateRoadmapForm'
import { RoadmapFeed } from './components/RoadmapFeed'

export interface RoadmapFeedPageProps {
  onOpenRoadmap: (roadmapId: number) => void
  onCreateRoadmapDone?: () => void
}

export function RoadmapFeedPage({ onOpenRoadmap, onCreateRoadmapDone }: RoadmapFeedPageProps) {
  const [reloadKey, setReloadKey] = useState(0)
  const [searchDraft, setSearchDraft] = useState('')
  const [activeSearch, setActiveSearch] = useState<string | undefined>(undefined)

  const subtitle = useMemo(() => {
    if (!activeSearch) return 'Browse study plans and learning paths'
    return `Search: ${activeSearch}`
  }, [activeSearch])

  const handleCreated = () => {
    setReloadKey((value) => value + 1)
    if (onCreateRoadmapDone) {
      onCreateRoadmapDone()
    }
  }

  return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-600 dark:text-violet-300">
                Study Roadmaps
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
                Learning paths
              </h1>
              <p className="max-w-2xl text-sm text-slate-500 dark:text-zinc-400">
                Explore curated study plans, open a roadmap, and drill into each node in the tree.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:sticky lg:top-8">
            <CreateRoadmapForm
                onCreated={handleCreated}
                onSuccessNavigate={onCreateRoadmapDone}
            />
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
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-violet-400 dark:focus:ring-violet-500/20"
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
                onSelectRoadmap={onOpenRoadmap}
            />
          </div>
        </div>
      </main>
  )
}