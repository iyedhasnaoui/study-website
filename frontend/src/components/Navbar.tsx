import type { ForumRoute } from '../features/forum/forumRoutes'

interface NavbarProps {
  activeSection: 'forum' | 'roadmaps'
  activeForumRoute: ForumRoute
  onNavigateForum: (route: ForumRoute) => void
  onNavigateRoadmaps: () => void
}

export function Navbar({
  activeSection,
  // activeForumRoute,
  onNavigateForum,
  onNavigateRoadmaps,
}: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/60 bg-white/85 backdrop-blur-xl dark:border-zinc-900/70 dark:bg-zinc-950/80">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 font-semibold text-slate-900 dark:text-zinc-100">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-lg text-white shadow-sm">
            :)
          </span>
          <span className="text-lg tracking-tight">Study Website</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeSection === 'forum'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200'
            }`}
            onClick={() => onNavigateForum('feed')}
          >
            Forum
          </button>
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeSection === 'roadmaps'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200'
            }`}
            onClick={onNavigateRoadmaps}
          >
            Roadmaps
          </button>
          {/*{activeSection === 'forum' ? (*/}
          {/*  <button*/}
          {/*    type="button"*/}
          {/*    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${*/}
          {/*      activeForumRoute === 'create'*/}
          {/*        ? 'bg-violet-600 text-white shadow-sm'*/}
          {/*        : 'border border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200'*/}
          {/*    }`}*/}
          {/*    onClick={() => onNavigateForum('create')}*/}
          {/*  >*/}
          {/*    New post*/}
          {/*  </button>*/}
          {/*) : null}*/}
        </div>
      </div>
    </nav>
  )
}