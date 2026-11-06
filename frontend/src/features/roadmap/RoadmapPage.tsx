import { useEffect, useState } from 'react'

import { useAuth } from '../../auth/AuthContext'
import { CreateRoadmapForm } from './components/CreateRoadmapForm'
import { RoadmapDetailPage } from './RoadmapDetailPage'
import { RoadmapFeedPage, type RoadmapFeedPageProps } from './RoadmapFeedPage'
import { getRoadmapHash, getRoadmapRouteFromHash, type RoadmapRoute } from './roadmapRoutes'

interface RoadmapPageProps {
  onBackToFeed?: () => void
  sharedFilters?: RoadmapFeedPageProps['sharedFilters']
  page?: number
  size?: number
  onTotalPages?: (totalPages: number) => void
}

export function RoadmapPage({ onBackToFeed, sharedFilters, page, size, onTotalPages }: RoadmapPageProps = {}) {
  const { canContribute } = useAuth()
  const [route, setRoute] = useState<RoadmapRoute>(() => {
    if (typeof window === 'undefined') return { name: 'feed' }
    return getRoadmapRouteFromHash(window.location.hash)
  })

  // Incremented each time the route returns to the feed so that RoadmapFeedPage
  // remounts and fetches fresh data instead of showing stale state from a previous visit.
  const [feedNavigationKey, setFeedNavigationKey] = useState(0)

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = getRoadmapHash({ name: 'feed' })
    }

    const onHashChange = () => {
      const next = getRoadmapRouteFromHash(window.location.hash)
      setRoute(next)
      if (next.name === 'feed') {
        setFeedNavigationKey((k) => k + 1) // force remount of RoadmapFeedPage to refresh data
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (next: RoadmapRoute) => {
    const nextHash = getRoadmapHash(next)
    if (window.location.hash !== nextHash) window.location.hash = nextHash
    setRoute(next)
  }

  const handleBackToFeed = onBackToFeed ?? (() => navigate({ name: 'feed' }))

  if (route.name === 'detail' || route.name === 'node') {
    const roadmapId = route.roadmapId

    return (
      <RoadmapDetailPage
        key={roadmapId}
        roadmapId={roadmapId}
        focusNodeId={route.name === 'node' ? route.nodeId : null}
        onBackToFeed={handleBackToFeed}
      />
    )
  }

  if (route.name === 'create') {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            type="button"
            onClick={handleBackToFeed}
            className="text-sm font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400"
          >
            ← Back to feed
          </button>
        </div>
        {canContribute ? (
          <CreateRoadmapForm
            onCreated={(roadmapId) => navigate({ name: 'detail', roadmapId })}
          />
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/50 dark:bg-amber-950/20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Members contribute</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-300">
              Ask an administrator for contributor access to publish your own roadmap.
            </p>
          </div>
        )}
      </main>
    )
  }

  return (
    <RoadmapFeedPage
      key={feedNavigationKey}
      onOpenRoadmap={(roadmapId) => navigate({ name: 'detail', roadmapId })}
      onOpenCreate={() => navigate({ name: 'create' })}
      sharedFilters={sharedFilters}
      page={page}
      size={size}
      onTotalPages={onTotalPages}
    />
  )
}
