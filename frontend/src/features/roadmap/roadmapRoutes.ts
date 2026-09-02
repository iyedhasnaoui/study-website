export type RoadmapRoute =
  | { name: 'feed' }
  | { name: 'create' }
  | { name: 'detail'; roadmapId: number }
  | { name: 'node'; roadmapId: number; nodeId: number }

export const ROADMAP_FEED_HASH = '#roadmaps'
export const ROADMAP_CREATE_HASH = '#roadmaps/new'

export function getRoadmapRouteFromHash(hash: string): RoadmapRoute {
  if (hash === ROADMAP_CREATE_HASH) {
    return { name: 'create' }
  }

  const roadmapDetailMatch = hash.match(/^#roadmaps\/(\d+)$/)
  if (roadmapDetailMatch) {
    return { name: 'detail', roadmapId: Number(roadmapDetailMatch[1]) }
  }

  const nodeDetailMatch = hash.match(/^#roadmaps\/(\d+)\/nodes\/(\d+)$/)
  if (nodeDetailMatch) {
    return {
      name: 'node',
      roadmapId: Number(nodeDetailMatch[1]),
      nodeId: Number(nodeDetailMatch[2]),
    }
  }

  return { name: 'feed' }
}

export function getRoadmapHash(route: RoadmapRoute): string {
  switch (route.name) {
    case 'create':
      return ROADMAP_CREATE_HASH
    case 'detail':
      return `#roadmaps/${route.roadmapId}`
    case 'node':
      return `#roadmaps/${route.roadmapId}/nodes/${route.nodeId}`
    case 'feed':
    default:
      return ROADMAP_FEED_HASH
  }
}