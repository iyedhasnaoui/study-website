import { useEffect, useState } from 'react'

import { deleteRoadmap, getRoadmaps } from '../api/roadmapApi'
import type { RoadmapResponseDto } from '../types'
import { countNodes, formatDateTime } from '../utils'

export interface RoadmapFeedProps {
  reloadKey?: number
  searchFilter?: string
  onSelectRoadmap?: (roadmapId: number) => void
}

const getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : 'Unable to load roadmaps.'

export function RoadmapFeed({ reloadKey = 0, searchFilter, onSelectRoadmap }: RoadmapFeedProps = {}) {
  const [roadmaps, setRoadmaps] = useState<RoadmapResponseDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingRoadmapId, setDeletingRoadmapId] = useState<number | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadRoadmaps = async () => {
      setIsLoading(true)
      setLoadError(null)
      setDeleteError(null)

      try {
        const response = await getRoadmaps(searchFilter)
        if (isMounted) {
          setRoadmaps(response)
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(getErrorMessage(error))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadRoadmaps()

    return () => {
      isMounted = false
    }
  }, [reloadKey, searchFilter])

  const handleOpen = (roadmapId: number) => {
    if (onSelectRoadmap) {
      onSelectRoadmap(roadmapId)
    } else {
      window.location.hash = `#roadmaps/${roadmapId}`
    }
  }

  const handleDelete = async (roadmapId: number) => {
    setDeletingRoadmapId(roadmapId)
    setDeleteError(null)

    try {
      await deleteRoadmap(roadmapId)
      setRoadmaps((current) => current.filter((roadmap) => roadmap.id !== roadmapId))
    } catch (error) {
      setDeleteError(getErrorMessage(error))
    } finally {
      setDeletingRoadmapId(null)
    }
  }

  return (
      <section className="space-y-5" aria-labelledby="roadmap-feed-heading">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="roadmap-feed-heading" className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
              Available roadmaps
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
              Open a roadmap to explore its tree and individual study nodes.
            </p>
          </div>
        </div>

        {isLoading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
              Loading roadmaps…
            </div>
        ) : null}

        {!isLoading && loadError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              {loadError}
            </div>
        ) : null}

        {!isLoading && !loadError && deleteError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              {deleteError}
            </div>
        ) : null}

        {!isLoading && !loadError && roadmaps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-8 text-sm text-slate-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
              <strong className="block text-base font-semibold text-slate-900 dark:text-zinc-100">No roadmaps yet.</strong>
              <span className="mt-1 block">Create the first learning path.</span>
            </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2" aria-live="polite">
          {roadmaps.map((roadmap) => {
            const nodeCount = countNodes(roadmap.nodes)

            return (
                <article
                    key={roadmap.id}
                    className="rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950/80"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
                        {roadmap.title}
                      </h3>

                      <button
                          type="button"
                          onClick={() => handleOpen(roadmap.id)}
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-violet-500/50 dark:hover:text-violet-200"
                      >
                        Open
                      </button>
                    </div>

                    <p className="text-sm leading-6 text-slate-600 dark:text-zinc-300">
                      {roadmap.description || 'No description provided.'}
                    </p>
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-900/60">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                        Author
                      </dt>
                      <dd className="mt-1 font-semibold text-slate-900 dark:text-zinc-100">
                        {roadmap.authorUsername ?? (roadmap.authorId != null ? `User #${roadmap.authorId}` : 'Unknown')}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-900/60">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                        Nodes
                      </dt>
                      <dd className="mt-1 font-semibold text-slate-900 dark:text-zinc-100">{nodeCount}</dd>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-900/60 col-span-2">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                        Updated
                      </dt>
                      <dd className="mt-1 font-semibold text-slate-900 dark:text-zinc-100">
                        {formatDateTime(roadmap.updatedAt)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleOpen(roadmap.id)}
                        className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500"
                    >
                      View roadmap
                    </button>

                    <button
                        type="button"
                        onClick={() => handleDelete(roadmap.id)}
                        disabled={deletingRoadmapId === roadmap.id}
                        className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/70 dark:text-rose-300 dark:hover:bg-rose-950/40"
                    >
                      {deletingRoadmapId === roadmap.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </article>
            )
          })}
        </div>
      </section>
  )
}