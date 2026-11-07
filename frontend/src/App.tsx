import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import './App.css'
import { useAuth } from './auth/AuthContext'
import { Navbar } from './components/Navbar'
import { CreatePostPage } from './features/forum/CreatePostPage'
import { ForumFeedPage } from './features/forum/ForumFeedPage'
import { ForumPostPage } from './features/forum/ForumPostPage'
import { getForumHash, getForumRouteFromHash, getPostIdFromHash, type ForumRoute } from './features/forum/forumRoutes'
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

const isZitounaHash = (hash: string) => hash.startsWith('#zitouna')
const isDetailHash = (hash: string) => /^#(?:forum\/\d+|roadmaps\/\d+)/.test(hash)
const HISTORY_ENTRY_ID = '__studyWebsiteHistoryEntryId'

function App() {
  const { session, logout, login, register, isAdmin } = useAuth()
  const [section, setSection] = useState<AppSection>(() => getSectionFromHash(window.location.hash))
  const [hash, setHash] = useState(() => window.location.hash)
  const [hasVisitedZitouna, setHasVisitedZitouna] = useState(() => window.location.hash.startsWith('#zitouna'))
  const [forumRoute, setForumRoute] = useState<ForumRoute>(() => getForumRouteFromHash(window.location.hash))
  const [forumPostId, setForumPostId] = useState<number | null>(() => getPostIdFromHash(window.location.hash))
  const [toast, setToast] = useState<string | null>(null)
  const pendingScrollY = useRef<number | null>(null)
  const isTraversingHistory = useRef(false)
  const lastHandledHash = useRef(window.location.hash)
  const currentHash = useRef(window.location.hash)
  const currentEntryId = useRef<string | null>(null)
  const historyEntryIds = useRef<string[]>([])
  const historyEntryIndex = useRef<number | null>(null)
  const zitounaEntryId = useRef<string | null>(null)
  const scrollPositions = useRef(new Map<string, number>())
  const nextEntryId = useRef(0)
  const syncCurrentHashEntryRef = useRef<() => void>(() => {})
  const entryIdBeforeTransition = useRef<string | null>(null)

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'

    const createEntryId = () => `study-${Date.now()}-${nextEntryId.current++}`
    const saveEntryId = (entryId: string) => {
      const state = window.history.state
      window.history.replaceState(
        {...(state && typeof state === 'object' ? state : {}), [HISTORY_ENTRY_ID]: entryId},
        '',
        window.location.href,
      )
    }
    const pushCurrentHashEntry = (nextHash: string) => {
      const previousEntryId = entryIdBeforeTransition.current
      const entryId = createEntryId()
      saveEntryId(entryId)
      currentEntryId.current = entryId
      scrollPositions.current.set(entryId, 0)

      const currentIndex = historyEntryIndex.current
      if (currentIndex === null) {
        historyEntryIds.current = [entryId]
        historyEntryIndex.current = 0
      } else {
        historyEntryIds.current = historyEntryIds.current.slice(0, currentIndex + 1)
        historyEntryIds.current.push(entryId)
        historyEntryIndex.current = historyEntryIds.current.length - 1
      }

      const previousHash = currentHash.current
      if (isDetailHash(nextHash) && isZitounaHash(previousHash)) {
        zitounaEntryId.current = previousEntryId
      } else if (!(isDetailHash(nextHash) && isDetailHash(previousHash))) {
        zitounaEntryId.current = null
      }
      currentHash.current = nextHash
    }
    const synchronizeCurrentHashEntry = () => {
      const nextHash = window.location.hash
      if (currentHash.current === nextHash) return
      entryIdBeforeTransition.current = currentEntryId.current
      pushCurrentHashEntry(nextHash)
    }
    syncCurrentHashEntryRef.current = synchronizeCurrentHashEntry
    const initializeCurrentEntry = () => {
      const state = window.history.state
      const existingId = state && typeof state === 'object' ? state[HISTORY_ENTRY_ID] : null
      const entryId = typeof existingId === 'string' ? existingId : createEntryId()
      if (typeof existingId !== 'string') saveEntryId(entryId)
      currentEntryId.current = entryId
      historyEntryIds.current = [entryId]
      historyEntryIndex.current = 0
      scrollPositions.current.set(entryId, window.scrollY)
    }

    const saveScrollPosition = () => {
      if (isTraversingHistory.current || !currentEntryId.current) return
      if (window.location.hash !== currentHash.current) {
        entryIdBeforeTransition.current = currentEntryId.current
        pushCurrentHashEntry(window.location.hash)
      }
      scrollPositions.current.set(currentEntryId.current, window.scrollY)
    }
    const handlePopState = () => {
      const state = window.history.state
      const entryId = state && typeof state === 'object' ? state[HISTORY_ENTRY_ID] : null
      entryIdBeforeTransition.current = currentEntryId.current
      if (typeof entryId !== 'string' && window.location.hash !== currentHash.current) {
        isTraversingHistory.current = false
        pushCurrentHashEntry(window.location.hash)
        setHash(window.location.hash)
        setSection(getSectionFromHash(window.location.hash))
        setForumRoute(getForumRouteFromHash(window.location.hash))
        setForumPostId(getPostIdFromHash(window.location.hash))
        if (window.location.hash.startsWith('#zitouna')) setHasVisitedZitouna(true)
        return
      }
      currentEntryId.current = typeof entryId === 'string' ? entryId : null
      historyEntryIndex.current = typeof entryId === 'string' ? historyEntryIds.current.indexOf(entryId) : -1
      if (historyEntryIndex.current < 0) historyEntryIndex.current = null
      pendingScrollY.current = typeof entryId === 'string' ? scrollPositions.current.get(entryId) ?? 0 : 0
      isTraversingHistory.current = true

      if (window.location.hash === currentHash.current) {
        window.scrollTo({top: pendingScrollY.current})
        pendingScrollY.current = null
        isTraversingHistory.current = false
      }
    }
    const handleHashChange = () => {
      const nextHash = window.location.hash
      if (nextHash === currentHash.current) return
      if (!isTraversingHistory.current) entryIdBeforeTransition.current = currentEntryId.current
      if (isTraversingHistory.current) {
        const state = window.history.state
        const entryId = state && typeof state === 'object' ? state[HISTORY_ENTRY_ID] : null
        if (typeof entryId === 'string') {
          currentEntryId.current = entryId
          const entryIndex = historyEntryIds.current.indexOf(entryId)
          historyEntryIndex.current = entryIndex < 0 ? null : entryIndex
        } else {
          currentEntryId.current = null
        }
        const previousHash = currentHash.current
        if (isDetailHash(nextHash) && isZitounaHash(previousHash)) {
          zitounaEntryId.current = entryIdBeforeTransition.current
        } else if (!(isDetailHash(nextHash) && isDetailHash(previousHash))) {
          zitounaEntryId.current = null
        }
        currentHash.current = nextHash
      } else {
        pushCurrentHashEntry(nextHash)
      }
      setHash(nextHash)
      setSection(getSectionFromHash(nextHash))
      setForumRoute(getForumRouteFromHash(nextHash))
      setForumPostId(getPostIdFromHash(nextHash))
      if (nextHash.startsWith('#zitouna')) setHasVisitedZitouna(true)
    }

    if (!window.location.hash) window.location.hash = '#home'
    initializeCurrentEntry()
    window.addEventListener('scroll', saveScrollPosition, {passive: true})
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('hashchange', handleHashChange)
    return () => {
      window.removeEventListener('scroll', saveScrollPosition)
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('hashchange', handleHashChange)
      window.history.scrollRestoration = previousScrollRestoration
    }
  }, [])

  useLayoutEffect(() => {
    if (hash === lastHandledHash.current) return
    lastHandledHash.current = hash
    window.scrollTo({top: pendingScrollY.current ?? 0})
    pendingScrollY.current = null
    isTraversingHistory.current = false
  }, [hash])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const navigateHome = () => {
    syncCurrentHashEntryRef.current()
    window.location.hash = '#home'
    setSection('home')
  }

  const navigateForum = (nextRoute: ForumRoute, postId?: number) => {
    if (nextRoute === 'create' && !session) {
      openAuth('login')
      return
    }
    syncCurrentHashEntryRef.current()
    const nextHash = getForumHash(nextRoute, postId)
    if (window.location.hash !== nextHash) window.location.hash = nextHash
    setSection('forum')
    setForumRoute(nextRoute)
    setForumPostId(postId ?? null)
  }

  const navigateZitouna = () => {
    syncCurrentHashEntryRef.current()
    if (window.location.hash !== '#zitouna') window.location.hash = '#zitouna'
    setHasVisitedZitouna(true)
    setSection('zitouna')
  }

  const navigateZitounaToTab = (tab: 'forum' | 'roadmaps') => {
    syncCurrentHashEntryRef.current()
    window.location.hash = `#zitouna/${tab}`
    setHasVisitedZitouna(true)
    setSection('zitouna')
  }

  const navigateAdmin = () => {
    syncCurrentHashEntryRef.current()
    window.location.hash = '#admin'
    setSection('admin')
  }

  const navigateAbout = () => {
    syncCurrentHashEntryRef.current()
    window.location.hash = '#about'
    setSection('about')
  }

  // Credentials live in Keycloak, so signing in and joining hand off to its hosted pages.
  const openAuth = (mode: 'login' | 'register') => (mode === 'login' ? login() : register())

  const returnToZitouna = (tab: 'forum' | 'roadmaps') => {
    syncCurrentHashEntryRef.current()
    const originIndex = zitounaEntryId.current ? historyEntryIds.current.indexOf(zitounaEntryId.current) : -1
    const currentIndex = historyEntryIndex.current
    if (originIndex >= 0 && currentIndex !== null && originIndex < currentIndex) {
      window.history.go(originIndex - currentIndex)
      return
    }
    navigateZitounaToTab(tab)
  }

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

      {hasVisitedZitouna ? (
        <div hidden={section !== 'zitouna'}>
          <ZitounaPage
            onCreatePost={() => navigateForum('create')}
            onRequireLogin={() => openAuth('login')}
            onOpenPost={(postId) => navigateForum('post', postId)}
          />
        </div>
      ) : null}

      {section === 'zitouna' ? null : section === 'home' ? (
        <HomePage
          onOpenZitouna={navigateZitouna}
          onOpenAbout={navigateAbout}
          onOpenProfile={() => session ? navigateZitouna() : openAuth('register')}
        />
      ) : section === 'about' ? (
        <AboutPage />
      ) : section === 'admin' ? (
        <AdminUsersPage />
      ) : section === 'roadmaps' ? (
        <RoadmapPage onBackToFeed={() => returnToZitouna('roadmaps')} />
      ) : forumRoute === 'create' ? (
        <CreatePostPage
          onBackToFeed={() => navigateZitounaToTab('forum')}
          onCreated={() => {
            setToast('Your post is waiting for admin approval.')
            navigateZitounaToTab('forum')
          }}
        />
      ) : forumRoute === 'post' && forumPostId ? (
        <ForumPostPage
          postId={forumPostId}
          onBack={() => returnToZitouna('forum')}
        />
      ) : (
        <ForumFeedPage
          onCreateNew={() => navigateForum('create')}
          onOpenPost={(postId) => navigateForum('post', postId)}
        />
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
