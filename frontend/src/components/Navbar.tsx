import type { ForumRoute } from '../features/forum/forumRoutes'

interface NavbarProps {
  activeRoute: ForumRoute
  onNavigate: (route: ForumRoute) => void
}

export function Navbar({ activeRoute, onNavigate }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/60 bg-white/85 backdrop-blur-xl dark:border-zinc-900/70 dark:bg-zinc-950/80">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 font-semibold text-slate-900 dark:text-zinc-100">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-lg text-white shadow-sm">
            
          </span>
          <span className="text-lg tracking-tight">Forum</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeRoute === 'feed'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-violet-500/50 dark:hover:text-violet-200'
            }`}
            onClick={() => onNavigate('feed')}
          >
            Feed
          </button>
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeRoute === 'create'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-violet-500/50 dark:hover:text-violet-200'
            }`}
            onClick={() => onNavigate('create')}
          >
            New post
          </button>
        </div>
      </div>
    </nav>
  )
}

