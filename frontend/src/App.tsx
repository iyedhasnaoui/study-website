import { useEffect, useState } from 'react'

import { Navbar } from './components/Navbar'
import { ForumFeedPage } from './features/forum/ForumFeedPage'
import { CreatePostPage } from './features/forum/CreatePostPage'
import {
  getForumHash,
  getForumRouteFromHash,
  type ForumRoute,
} from './features/forum/forumRoutes'
import { RoadmapPage } from './features/roadmap/RoadmapPage'

type AppSection = 'forum' | 'roadmaps'

function App() {
  const [section, setSection] = useState<AppSection>(() => {
    if (typeof window === 'undefined') return 'forum'
    return window.location.hash.startsWith('#roadmaps') ? 'roadmaps' : 'forum'
  })

  const [forumRoute, setForumRoute] = useState<ForumRoute>(() => {
    if (typeof window === 'undefined') return 'feed'
    return getForumRouteFromHash(window.location.hash)
  })

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      setSection(hash.startsWith('#roadmaps') ? 'roadmaps' : 'forum')
      setForumRoute(getForumRouteFromHash(hash))
    }

    if (!window.location.hash) {
      window.location.hash = getForumHash('feed')
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigateForum = (nextRoute: ForumRoute) => {
    const nextHash = getForumHash(nextRoute)
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash
    }
    setSection('forum')
    setForumRoute(nextRoute)
  }

  const navigateRoadmaps = () => {
    window.location.hash = '#roadmaps'
    setSection('roadmaps')
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:bg-gray-800 dark:text-zinc-100">
      <Navbar
        activeSection={section}
        onNavigateForum={navigateForum}
        onNavigateRoadmaps={navigateRoadmaps}
        activeForumRoute={forumRoute}
      />
      {section === 'roadmaps' ? (
        <RoadmapPage />
      ) : forumRoute === 'create' ? (
        <CreatePostPage onBackToFeed={() => navigateForum('feed')} onCreated={() => navigateForum('feed')} />
      ) : (
        <ForumFeedPage onCreateNew={() => navigateForum('create')} />
      )}
    </div>
  )
}

export default App