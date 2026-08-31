export type ForumRoute = 'feed' | 'create'

export const FORUM_FEED_HASH = '#forum'
export const FORUM_CREATE_HASH = '#forum/new'

export const getForumRouteFromHash = (hash: string): ForumRoute =>
  hash === FORUM_CREATE_HASH ? 'create' : 'feed'

export const getForumHash = (route: ForumRoute): string =>
  route === 'create' ? FORUM_CREATE_HASH : FORUM_FEED_HASH

