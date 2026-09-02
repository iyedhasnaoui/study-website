import { useEffect, useMemo, useState } from 'react'

import { getForumPosts, getForumTopics } from './api/forumApi'
import { PostFeed } from './components/PostFeed'
import type { ForumPostResponseDto, ForumTopicResponseDto } from './types'

interface ForumFeedPageProps {
  onCreateNew: () => void
}

export function ForumFeedPage({ onCreateNew }: ForumFeedPageProps) {
  const [topics, setTopics] = useState<ForumTopicResponseDto[]>([])
  const [posts, setPosts] = useState<ForumPostResponseDto[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'latest' | 'oldest'>('latest')
  const [tagFilter, setTagFilter] = useState('')
  // const [reloadKey, setReloadKey] = useState(0)

  // Fetch topics and posts for stats & sidebar counts
  useEffect(() => {
    let isMounted = true

    Promise.all([getForumTopics(), getForumPosts(tagFilter)])
        .then(([topicsData, postsData]) => {
          if (isMounted) {
            setTopics(topicsData)
            setPosts(postsData)
          }
        })
        .catch((err) => console.error('Failed to load forum feed data:', err))

    return () => {
      isMounted = false
    }
  // }, [tagFilter, reloadKey])
  }, [tagFilter])

  // Derive real top contributors from actual database posts
  const topContributors = useMemo(() => {
    const contributorMap = new Map<string, { username: string; count: number; userId: number | null }>()

    for (const post of posts) {
      const username = post.authorUsername || `User #${post.authorId ?? 'unknown'}`
      const existing = contributorMap.get(username)

      if (existing) {
        existing.count += 1
      } else {
        contributorMap.set(username, {
          username,
          count: 1,
          userId: post.authorId,
        })
      }
    }

    return Array.from(contributorMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
  }, [posts])

  // Compute live post counts per topic
  const postCountsByTopic = useMemo(() => {
    const counts: Record<number, number> = {}
    for (const post of posts) {
      if (post.topicId != null) {
        counts[post.topicId] = (counts[post.topicId] ?? 0) + 1
      }
    }
    return counts
  }, [posts])

  return (
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top Banner */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600 dark:text-violet-300">
                Forum
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                Posts
              </h1>
            </div>

            <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500"
                onClick={onCreateNew}
            >
              New discussion
            </button>
          </div>
        </section>

        {/* GitHub Discussions 3-Column Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Categories */}
          <aside className="space-y-4 lg:col-span-3">
            <div className="rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
              <h2 className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Categories
              </h2>
              <nav className="space-y-1">
                <button
                    type="button"
                    onClick={() => setSelectedTopicId(null)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${
                        selectedTopicId === null
                            ? 'bg-violet-50 font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-900'
                    }`}
                >
                <span className="flex items-center gap-2">
                  <span>💬</span>
                  <span>All Discussions</span>
                </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {posts.length}
                </span>
                </button>

                {topics.map((topic) => (
                    <button
                        key={topic.id}
                        type="button"
                        onClick={() => setSelectedTopicId(topic.id)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${
                            selectedTopicId === topic.id
                                ? 'bg-violet-50 font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-900'
                        }`}
                    >
                  <span className="flex items-center gap-2 truncate">
                    <span>{topic.icon ?? '📁'}</span>
                    <span className="truncate">{topic.name}</span>
                  </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {postCountsByTopic[topic.id] ?? 0}
                  </span>
                    </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Center Column: Filter Toolbar & Post Feed */}
          <section className="space-y-4 lg:col-span-6">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
              <input
                  type="text"
                  placeholder="Search discussions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-w-36 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />

              <input
                  type="text"
                  placeholder="Filter tag..."
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="w-28 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />

              <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'latest' | 'oldest')}
                  aria-label="Sort discussions"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-violet-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              >
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>

            <PostFeed
                // reloadKey={reloadKey}
                selectedTopicId={selectedTopicId}
                searchQuery={searchQuery}
                sortBy={sortBy}
                tagFilter={tagFilter}
            />
          </section>
          <aside className="space-y-4 lg:col-span-3">
            <div className="rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Active Contributors
              </h2>
              {topContributors.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-zinc-500">No contributors yet.</p>
              ) : (
                  <ul className="space-y-2.5">
                    {topContributors.map((c) => (
                        <li key={c.username} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 truncate">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                        {c.username.slice(0, 1).toUpperCase()}
                      </span>
                            <span className="truncate font-medium text-slate-800 dark:text-zinc-200">
                        {c.username}
                      </span>
                          </div>
                          <span className="text-xs text-slate-400 dark:text-zinc-500">
                      {c.count} {c.count === 1 ? 'post' : 'posts'}
                    </span>
                        </li>
                    ))}
                  </ul>
              )}
            </div>

            {/* Forum Guidelines */}
            <div className="rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Guidelines
              </h2>
              <ul className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-400">
                <li>• Pick the matching category to help others find your thread.</li>
                <li>• Format code blocks and LaTeX expressions clearly.</li>
                <li>• Search existing questions before starting a duplicate topic.</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
  )
}