import { useEffect, useState } from 'react'

import { Navbar } from './components/Navbar'
import { CreatePostPage } from './features/forum/CreatePostPage'
import { ForumFeedPage } from './features/forum/ForumFeedPage'
import {
  getForumHash,
  getForumRouteFromHash,
  type ForumRoute,
} from './features/forum/forumRoutes'
import './features/forum/forum.css'
import './App.css'

function App() {
  const [route, setRoute] = useState<ForumRoute>(() => {
    if (typeof window === 'undefined') {
      return 'feed'
    }

    return getForumRouteFromHash(window.location.hash)
  })

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = getForumHash('feed')
    }

    const handleHashChange = () => {
      setRoute(getForumRouteFromHash(window.location.hash))
    }

    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const navigate = (nextRoute: ForumRoute) => {
    const nextHash = getForumHash(nextRoute)

    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash
    }

    setRoute(nextRoute)
  }

  return (
    <div className="app">
      <Navbar activeRoute={route} onNavigate={navigate} />
      {route === 'create' ? (
        <CreatePostPage onBackToFeed={() => navigate('feed')} onCreated={() => navigate('feed')} />
      ) : (
        <ForumFeedPage onCreateNew={() => navigate('create')} />
      )}
    </div>
  )
}

export default App
