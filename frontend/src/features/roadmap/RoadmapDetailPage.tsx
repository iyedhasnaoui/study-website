import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '../../auth/AuthContext'
import { extractErrorMessage, getRoadmapGraph } from './api/roadmapApi'
import { RoadmapGraphEditor } from './components/RoadmapGraphEditor'
import type { RoadmapGraphResponseDto } from './types'
import { formatDateTime } from './utils'

interface RoadmapDetailPageProps {
  roadmapId: number
  focusNodeId?: number | null
  onBackToFeed: () => void
}

export function RoadmapDetailPage({
  roadmapId,
  focusNodeId,
  onBackToFeed,
}: RoadmapDetailPageProps) {
  const { session } = useAuth()
  const [graph, setGraph] = useState<RoadmapGraphResponseDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await getRoadmapGraph(roadmapId)
        if (isMounted) setGraph(response)
      } catch (loadError) {
        if (isMounted) setError(extractErrorMessage(loadError, 'Unable to load roadmap.'))
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [roadmapId])

  const leaveToFeed = useCallback(() => {
    if (isDirty && !window.confirm('You have unsaved changes. Leave this roadmap anyway?')) return
    onBackToFeed()
  }, [isDirty, onBackToFeed])

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
          Loading roadmap…
        </div>
      </main>
    )
  }

  if (error || !graph) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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

  const canEdit = Boolean(session && session.user.id === graph.authorId)

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-6 rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-300">
              Study Roadmaps
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
              {graph.title}
            </h1>
            <p className="max-w-3xl text-sm text-slate-500 dark:text-zinc-400">
              {graph.description || 'No description provided.'}
            </p>
          </div>

          <button
            type="button"
            onClick={leaveToFeed}
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-amber-500/50 dark:hover:text-amber-200"
          >
            Back to roadmaps
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <Stat label="Author" value={graph.authorUsername ?? `User #${graph.authorId ?? '?'}`} />
          <Stat label="Nodes" value={String(graph.nodes.length)} />
          <Stat label="Connections" value={String(graph.edges.length)} />
          <Stat label="Updated" value={formatDateTime(graph.updatedAt)} />
        </dl>
      </section>

      <RoadmapGraphEditor
        roadmapId={roadmapId}
        graph={graph}
        canEdit={canEdit}
        focusNodeId={focusNodeId}
        onDirtyChange={setIsDirty}
      />
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-900/60">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-slate-900 dark:text-zinc-100">{value}</dd>
    </div>
  )
}
