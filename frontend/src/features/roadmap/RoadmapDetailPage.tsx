import { useEffect, useState } from 'react'

import { getRoadmapById } from './api/roadmapApi'
import { RoadmapTree } from './components/RoadmapTree'
import type { RoadmapResponseDto } from './types'
import { countNodes, formatDateTime } from './utils'

interface RoadmapDetailPageProps {
  roadmapId: number
  onBackToFeed: () => void
  onOpenNode: (nodeId: number) => void
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unable to load roadmap.'

export function RoadmapDetailPage({ roadmapId, onBackToFeed, onOpenNode }: RoadmapDetailPageProps) {
  const [roadmap, setRoadmap] = useState<RoadmapResponseDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await getRoadmapById(roadmapId)
        if (isMounted) {
          setRoadmap(response)
        }
      } catch (submissionError) {
        if (isMounted) {
          setError(getErrorMessage(submissionError))
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [roadmapId])

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
          Loading roadmap…
        </div>
      </main>
    )
  }

  if (error || !roadmap) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            {error ?? 'Roadmap not found.'}
          </div>
          <button
            type="button"
            onClick={onBackToFeed}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
          >
            Back to roadmaps
          </button>
        </div>
      </main>
    )
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
              {roadmap.title}
            </h1>
            <p className="max-w-3xl text-sm text-slate-500 dark:text-zinc-400">
              {roadmap.description || 'No description provided.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToFeed}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-violet-500/50 dark:hover:text-violet-200"
          >
            Back to roadmaps
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-900/60">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">Author</dt>
            <dd className="mt-1 font-semibold text-slate-900 dark:text-zinc-100">
              {roadmap.authorUsername ?? (roadmap.authorId != null ? `User #${roadmap.authorId}` : 'Unknown')}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-900/60">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">Nodes</dt>
            <dd className="mt-1 font-semibold text-slate-900 dark:text-zinc-100">{countNodes(roadmap.nodes)}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-900/60">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">Created</dt>
            <dd className="mt-1 font-semibold text-slate-900 dark:text-zinc-100">{formatDateTime(roadmap.createdAt)}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-900/60">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">Updated</dt>
            <dd className="mt-1 font-semibold text-slate-900 dark:text-zinc-100">{formatDateTime(roadmap.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      <RoadmapTree nodes={roadmap.nodes} onNodeClick={onOpenNode} />
    </main>
  )
}