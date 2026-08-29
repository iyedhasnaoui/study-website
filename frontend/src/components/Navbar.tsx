import './Navbar.css'

export function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar__container">
        <div className="navbar__logo">
          <span className="navbar__logo-icon">📚</span>
          <span className="navbar__logo-text">StudyHub</span>
        </div>
        
        <ul className="navbar__menu">
          <li><a href="#forum" className="navbar__link">Forum</a></li>
          <li><a href="#resources" className="navbar__link">Resources</a></li>
          <li><a href="#about" className="navbar__link">About</a></li>
        </ul>

        <div className="navbar__actions">
          <button className="navbar__button navbar__button--secondary">Sign in</button>
          <button className="navbar__button navbar__button--primary">Get Started</button>
        </div>
      </div>
    </nav>
  )
}

