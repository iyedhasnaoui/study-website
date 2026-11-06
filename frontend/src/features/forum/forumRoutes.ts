export type ForumRoute = 'feed' | 'create' | 'post'

export const FORUM_FEED_HASH = '#forum'
export const FORUM_CREATE_HASH = '#forum/new'
export const FORUM_POST_HASH_PREFIX = '#forum/'

export interface ForumPostRoute {
  type: 'post'
  postId: number
}

export const getForumRouteFromHash = (hash: string): ForumRoute => {
  if (hash === FORUM_CREATE_HASH) return 'create'
  if (hash.startsWith(FORUM_POST_HASH_PREFIX)) {
    const idPart = hash.slice(FORUM_POST_HASH_PREFIX.length)
    const id = Number(idPart)
    if (!Number.isNaN(id) && id > 0) return 'post'
  }
  return 'feed'
}

export const getPostIdFromHash = (hash: string): number | null => {
  if (hash.startsWith(FORUM_POST_HASH_PREFIX)) {
    const idPart = hash.slice(FORUM_POST_HASH_PREFIX.length)
    const id = Number(idPart)
    if (!Number.isNaN(id) && id > 0) return id
  }
  return null
}

export const getForumHash = (route: ForumRoute, postId?: number): string => {
  if (route === 'create') return FORUM_CREATE_HASH
  if (route === 'post' && postId) return `${FORUM_POST_HASH_PREFIX}${postId}`
  return FORUM_FEED_HASH
}

