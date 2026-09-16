import { useEffect, useState } from 'react'

import { RoadmapDetailPage } from './RoadmapDetailPage'
import { RoadmapFeedPage } from './RoadmapFeedPage'
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

  if (route.name === 'detail' || route.name === 'node') {
    const roadmapId = route.roadmapId

    return (
      <RoadmapDetailPage
        key={roadmapId}
        roadmapId={roadmapId}
        focusNodeId={route.name === 'node' ? route.nodeId : null}
        onBackToFeed={() => navigate({ name: 'feed' })}
      />
    )
  }

  return (
    <RoadmapFeedPage onOpenRoadmap={(roadmapId) => navigate({ name: 'detail', roadmapId })} />
  )
}
