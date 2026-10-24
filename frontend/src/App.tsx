import { useEffect, useState } from 'react'

import './App.css'
import { useAuth } from './auth/AuthContext'
import { Navbar } from './components/Navbar'
import { CreatePostPage } from './features/forum/CreatePostPage'
import { ForumFeedPage } from './features/forum/ForumFeedPage'
import { getForumHash, getForumRouteFromHash, type ForumRoute } from './features/forum/forumRoutes'
import { RoadmapPage } from './features/roadmap/RoadmapPage'
import { ZitounaPage } from './features/zitouna/ZitounaPage'
import { HomePage } from './pages/HomePage'
import { AboutPage } from './pages/AboutPage'
import { AdminUsersPage } from './features/admin/AdminUsersPage'

export type AppSection = 'home' | 'zitouna' | 'forum' | 'roadmaps' | 'about' | 'admin'

const getSectionFromHash = (hash: string): AppSection => {
  if (hash.startsWith('#roadmaps')) return 'roadmaps'
  if (hash.startsWith('#forum')) return 'forum'
  if (hash.startsWith('#zitouna')) return 'zitouna'
  if (hash.startsWith('#about')) return 'about'
  if (hash.startsWith('#admin')) return 'admin'
  return 'home'
}

function App() {
  const { session, logout, login, register, isAdmin } = useAuth()
  const [section, setSection] = useState<AppSection>(() => getSectionFromHash(window.location.hash))
  const [forumRoute, setForumRoute] = useState<ForumRoute>(() => getForumRouteFromHash(window.location.hash))
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
      openAuth('login')
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

  const navigateZitouna = () => {
    window.location.hash = '#zitouna'
    setSection('zitouna')
  }

  const navigateAdmin = () => {
    window.location.hash = '#admin'
    setSection('admin')
  }

  const navigateAbout = () => {
    window.location.hash = '#about'
    setSection('about')
  }

  // Credentials live in Keycloak, so signing in and joining hand off to its hosted pages.
  const openAuth = (mode: 'login' | 'register') => (mode === 'login' ? login() : register())

  const handleLogout = async () => {
    await logout()
    setToast('You have signed out safely.')
    navigateHome()
  }

  return (
    <div className="iac-app">
      <Navbar
        activeSection={section}
        activeForumRoute={forumRoute}
        user={session?.user ?? null}
        onNavigateHome={navigateHome}
        onNavigateZitouna={navigateZitouna}
        onNavigateAbout={navigateAbout}
        onOpenLogin={() => openAuth('login')}
        onOpenRegister={() => openAuth('register')}
        onLogout={handleLogout}
        onNavigateAdmin={navigateAdmin}
        isAdmin={isAdmin}
      />

      {section === 'home' ? (
        <HomePage
          onOpenZitouna={navigateZitouna}
          onOpenAbout={navigateAbout}
          onOpenProfile={() => session ? navigateZitouna() : openAuth('register')}
        />
      ) : section === 'zitouna' ? (
        <ZitounaPage
          onCreatePost={() => navigateForum('create')}
          onOpenForum={() => navigateForum('feed')}
          onOpenRoadmaps={navigateRoadmaps}
          onRequireLogin={() => openAuth('login')}
        />
      ) : section === 'about' ? (
        <AboutPage />
      ) : section === 'admin' ? (
        <AdminUsersPage />
      ) : section === 'roadmaps' ? (
        <RoadmapPage />
      ) : forumRoute === 'create' ? (
        <CreatePostPage
          onBackToFeed={() => navigateForum('feed')}
          onCreated={() => {
            setToast('Your post is waiting for admin approval.')
            navigateForum('feed')
          }}
        />
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
          <div><button type="button" onClick={navigateZitouna}>Zitouna</button><button type="button" onClick={navigateAbout}>About us</button></div>
          <small>© {new Date().getFullYear()} Ifriqiya Academic Circle</small>
        </div>
      </footer>


      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  )
}

export default App
