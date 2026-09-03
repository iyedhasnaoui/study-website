import { useEffect, useState } from 'react'

import type { AuthUser } from '../auth/types'
import type { ForumRoute } from '../features/forum/forumRoutes'

interface NavbarProps {
  activeSection: 'home' | 'forum' | 'roadmaps'
  activeForumRoute: ForumRoute
  user: AuthUser | null
  onNavigateHome: () => void
  onNavigateForum: (route: ForumRoute) => void
  onNavigateRoadmaps: () => void
  onOpenLogin: () => void
  onOpenRegister: () => void
  onLogout: () => Promise<void>
  onDeleteAccount: () => Promise<void>
}

export function Navbar({
  activeSection,
  activeForumRoute,
  user,
  onNavigateHome,
  onNavigateForum,
  onNavigateRoadmaps,
  onOpenLogin,
  onOpenRegister,
  onLogout,
  onDeleteAccount,
}: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => window.localStorage.getItem('iac.theme') === 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    window.localStorage.setItem('iac.theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const navigate = (action: () => void) => {
    action()
    setIsMenuOpen(false)
  }

  return (
    <header className="nav-wrap">
      <nav className="iac-nav" aria-label="Main navigation">
        <button className="brand" type="button" onClick={() => navigate(onNavigateHome)}>
          <span className="brand__mark"><img src="/assets/iac-logo.jpeg" alt="" /></span>
          <span className="brand__name">Ifriqiya <b>Academic Circle</b></span>
        </button>

        <button
          type="button"
          className="nav-toggle"
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          <span /><span />
        </button>

        <div className={`nav-panel ${isMenuOpen ? 'is-open' : ''}`}>
          <div className="nav-links">
            <button className={activeSection === 'home' ? 'is-active' : ''} type="button" onClick={() => navigate(onNavigateHome)}>Home</button>
            <button className={activeSection === 'forum' ? 'is-active' : ''} type="button" onClick={() => navigate(() => onNavigateForum('feed'))}>Forum</button>
            <button className={activeSection === 'roadmaps' ? 'is-active' : ''} type="button" onClick={() => navigate(onNavigateRoadmaps)}>Roadmaps</button>
            {activeSection === 'forum' && activeForumRoute === 'create' ? <span className="nav-context">Writing a post</span> : null}
          </div>

          <div className="nav-actions">
            <button className="theme-toggle" type="button" onClick={() => setIsDark((current) => !current)} aria-label={`Use ${isDark ? 'light' : 'dark'} theme`}>
              <span>{isDark ? '☀' : '☾'}</span>
            </button>

            {user ? (
              <div className="profile-menu">
                <button className="profile-trigger" type="button" onClick={() => setIsProfileOpen((current) => !current)} aria-expanded={isProfileOpen}>
                  <span>{user.username.slice(0, 1).toUpperCase()}</span>
                  <div><small>Signed in as</small><strong>{user.username}</strong></div>
                  <i>⌄</i>
                </button>
                {isProfileOpen ? (
                  <div className="profile-popover">
                    <p>{user.email}</p>
                    <button type="button" onClick={() => { setIsProfileOpen(false); void onLogout() }}>Sign out</button>
                    <button className="danger-link" type="button" onClick={() => {
                      if (window.confirm('Delete your IAC account? This cannot be undone.')) {
                        setIsProfileOpen(false)
                        void onDeleteAccount()
                      }
                    }}>Delete account</button>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <button className="nav-login" type="button" onClick={onOpenLogin}>Sign in</button>
                <button className="nav-join" type="button" onClick={onOpenRegister}>Join us <span>↗</span></button>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
