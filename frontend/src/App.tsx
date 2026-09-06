import { useEffect, useState } from 'react'

import './App.css'
import { AuthModal, type AuthMode } from './auth/AuthModal'
import { useAuth } from './auth/AuthContext'
import { getAuthError } from './auth/authApi'
import { Navbar } from './components/Navbar'
import { CreatePostPage } from './features/forum/CreatePostPage'
import { ForumFeedPage } from './features/forum/ForumFeedPage'
import { getForumHash, getForumRouteFromHash, type ForumRoute } from './features/forum/forumRoutes'
import { RoadmapPage } from './features/roadmap/RoadmapPage'
import { HomePage } from './pages/HomePage'

type AppSection = 'home' | 'forum' | 'roadmaps'

const getSectionFromHash = (hash: string): AppSection => {
  if (hash.startsWith('#roadmaps')) return 'roadmaps'
  if (hash.startsWith('#forum')) return 'forum'
  return 'home'
}

function App() {
  const { session, logout, removeAccount } = useAuth()
  const [section, setSection] = useState<AppSection>(() => getSectionFromHash(window.location.hash))
  const [forumRoute, setForumRoute] = useState<ForumRoute>(() => getForumRouteFromHash(window.location.hash))
  const [authDialog, setAuthDialog] = useState<{ open: boolean; mode: AuthMode }>({ open: false, mode: 'login' })
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const handleHashChange = () => {
      setSection(getSectionFromHash(window.location.hash))
      setForumRoute(getForumRouteFromHash(window.location.hash))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    if (!window.location.hash) window.location.hash = '#home'
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const navigateHome = () => {
    window.location.hash = '#home'
    setSection('home')
  }

  const navigateForum = (nextRoute: ForumRoute) => {
    if (nextRoute === 'create' && !session) {
      setAuthDialog({ open: true, mode: 'login' })
      return
    }
    const nextHash = getForumHash(nextRoute)
    if (window.location.hash !== nextHash) window.location.hash = nextHash
    setSection('forum')
    setForumRoute(nextRoute)
  }

  const navigateRoadmaps = () => {
    window.location.hash = '#roadmaps'
    setSection('roadmaps')
  }

  const openAuth = (mode: AuthMode) => setAuthDialog({ open: true, mode })

  const handleLogout = async () => {
    await logout()
    setToast('You have signed out safely.')
    navigateHome()
  }

  const handleDeleteAccount = async () => {
    try {
      await removeAccount()
      setToast('Your account has been deleted.')
      navigateHome()
    } catch (error) {
      setToast(getAuthError(error, 'The account could not be deleted.').message)
    }
  }

  return (
    <div className="iac-app">
      <Navbar
        activeSection={section}
        activeForumRoute={forumRoute}
        user={session?.user ?? null}
        onNavigateHome={navigateHome}
        onNavigateForum={navigateForum}
        onNavigateRoadmaps={navigateRoadmaps}
        onOpenLogin={() => openAuth('login')}
        onOpenRegister={() => openAuth('register')}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
      />

      {section === 'home' ? (
        <HomePage
          onOpenForum={() => navigateForum('feed')}
          onOpenRoadmaps={navigateRoadmaps}
          onJoin={() => session ? navigateForum('feed') : openAuth('register')}
        />
      ) : section === 'roadmaps' ? (
        <RoadmapPage />
      ) : forumRoute === 'create' ? (
        <CreatePostPage onBackToFeed={() => navigateForum('feed')} onCreated={() => navigateForum('feed')} />
      ) : (
        <ForumFeedPage onCreateNew={() => navigateForum('create')} />
      )}

      <footer className="site-footer">
        <div className="section-shell site-footer__inner">
          <button className="brand brand--footer" type="button" onClick={navigateHome}>
            <span className="brand__mark"><img src="/assets/iac-logo.jpeg" alt="" /></span>
            <span className="brand__name">Ifriqiya <b>Academic Circle</b></span>
          </button>
          <p>Built for curious minds and generous contributors.</p>
          <div><button type="button" onClick={() => navigateForum('feed')}>Forum</button><button type="button" onClick={navigateRoadmaps}>Roadmaps</button></div>
          <small>© {new Date().getFullYear()} Ifriqiya Academic Circle</small>
        </div>
      </footer>

      <AuthModal
        key={`${authDialog.mode}-${authDialog.open}`}
        isOpen={authDialog.open}
        initialMode={authDialog.mode}
        onClose={() => setAuthDialog((current) => ({ ...current, open: false }))}
      />

      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  )
}

export default App
