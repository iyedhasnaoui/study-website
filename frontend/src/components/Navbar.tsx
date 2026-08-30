import './Navbar.css'
import type { ForumRoute } from '../features/forum/forumRoutes'

interface NavbarProps {
  activeRoute: ForumRoute
  onNavigate: (route: ForumRoute) => void
}

export function Navbar({ activeRoute, onNavigate }: NavbarProps) {
  return (
    <nav className="navbar">
      <div className="navbar__container">
        <div className="navbar__logo">
          <span className="navbar__logo-icon">💬</span>
          <span className="navbar__logo-text">Forum</span>
        </div>

        <div className="navbar__actions">
          <button
            type="button"
            className={`navbar__button ${activeRoute === 'feed' ? 'navbar__button--active' : ''}`}
            onClick={() => onNavigate('feed')}
          >
            Feed
          </button>
          <button
            type="button"
            className={`navbar__button ${activeRoute === 'create' ? 'navbar__button--active' : ''}`}
            onClick={() => onNavigate('create')}
          >
            New post
          </button>
        </div>
      </div>
    </nav>
  )
}

