import { useEffect, useState } from 'react'

import { RoadmapDetailPage } from './RoadmapDetailPage'
import { RoadmapFeedPage } from './RoadmapFeedPage'
import { RoadmapNodeDetailPage } from './RoadmapNodeDetailPage'
import { getRoadmapHash, getRoadmapRouteFromHash, type RoadmapRoute } from './roadmapRoutes'

export function RoadmapPage() {
  const [route, setRoute] = useState<RoadmapRoute>(() => {
    if (typeof window === 'undefined') return { name: 'feed' }
    return getRoadmapRouteFromHash(window.location.hash)
  })

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = getRoadmapHash({ name: 'feed' })
    }

    const onHashChange = () => setRoute(getRoadmapRouteFromHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (next: RoadmapRoute) => {
    const nextHash = getRoadmapHash(next)
    if (window.location.hash !== nextHash) window.location.hash = nextHash
    setRoute(next)
  }

  if (route.name === 'detail') {
    return (
      <RoadmapDetailPage
        roadmapId={route.roadmapId}
        onBackToFeed={() => navigate({ name: 'feed' })}
        onOpenNode={(nodeId) => navigate({ name: 'node', roadmapId: route.roadmapId, nodeId })}
      />
    )
  }

  if (route.name === 'node') {
    return (
      <RoadmapNodeDetailPage
        roadmapId={route.roadmapId}
        nodeId={route.nodeId}
        onBack={() => navigate({ name: 'detail', roadmapId: route.roadmapId })}
      />
    )
  }

  return (
    <RoadmapFeedPage
      onOpenRoadmap={(roadmapId) => navigate({ name: 'detail', roadmapId })}
      onCreateRoadmapDone={() => navigate({ name: 'feed' })}
    />
  )
}