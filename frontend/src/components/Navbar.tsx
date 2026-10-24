import { useEffect, useState } from 'react'

import { ROLE_DESCRIPTIONS, type AuthUser } from '../auth/types'
import { RoleBadge } from './RoleBadge'
import type { ForumRoute } from '../features/forum/forumRoutes'
import type { AppSection } from '../App'

interface NavbarProps {
  activeSection: AppSection
  activeForumRoute: ForumRoute
  user: AuthUser | null
  onNavigateHome: () => void
  onNavigateZitouna: () => void
  onNavigateAbout: () => void
  onOpenLogin: () => void
  onOpenRegister: () => void
  onLogout: () => Promise<void>
  onNavigateAdmin: () => void
  isAdmin: boolean
}

export function Navbar({
  activeSection,
  activeForumRoute,
  user,
  onNavigateHome,
  onNavigateZitouna,
  onNavigateAbout,
  onOpenLogin,
  onOpenRegister,
  onLogout,
  onNavigateAdmin,
  isAdmin,
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
            <button className={activeSection === 'zitouna' ? 'is-active' : ''} type="button" onClick={() => navigate(onNavigateZitouna)}>Zitouna</button>
            <button className={activeSection === 'about' ? 'is-active' : ''} type="button" onClick={() => navigate(onNavigateAbout)}>About us</button>
            {isAdmin ? (
              <button className={activeSection === 'admin' ? 'is-active' : ''} type="button" onClick={() => navigate(onNavigateAdmin)}>Members</button>
            ) : null}
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
                  <RoleBadge role={user.role} title={ROLE_DESCRIPTIONS[user.role]} />
                  <i>⌄</i>
                </button>
                {isProfileOpen ? (
                  <div className="profile-popover">
                    <p>{user.email}</p>
                    <p className="role-note">{ROLE_DESCRIPTIONS[user.role]}</p>
                    {isAdmin ? (
                      <button type="button" onClick={() => { setIsProfileOpen(false); navigate(onNavigateAdmin) }}>Manage members</button>
                    ) : null}
                    <button type="button" onClick={() => { setIsProfileOpen(false); void onLogout() }}>Sign out</button>
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
