import {useMemo, useState, type FormEvent} from 'react'

import {createForumPost} from './api/forumApi'
import {CreatePostForm} from './components/CreatePostForm'
import {PostFeed} from './components/PostFeed'
import './forum.css'
import type {ForumPostCreateDto} from './types'

export function ForumPage() {
    const [reloadKey, setReloadKey] = useState(0)
    const [tagDraft, setTagDraft] = useState('')
    const [activeTagFilter, setActiveTagFilter] = useState<string | undefined>(undefined)

    const feedSubtitle = useMemo(() => {
        if (!activeTagFilter) {
            return 'Latest discussions'
        }

        return `Tag: #${activeTagFilter}`
    }, [activeTagFilter])

    const handleCreate = async (payload: ForumPostCreateDto) => {
        await createForumPost(payload)
        setReloadKey((current) => current + 1)
    }

    const applyTagFilter = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setActiveTagFilter(tagDraft.trim() || undefined)
        setReloadKey((current) => current + 1)
    }

    const clearTagFilter = () => {
        setTagDraft('')
        setActiveTagFilter(undefined)
        setReloadKey((current) => current + 1)
    }

    return (
        <main className="forum-page">
            <div className="forum-page__shell">
                <section className="forum-hero">
                    <div>
                        <h1>Forum</h1>
                    </div>
                </section>

                <div className="forum-layout">
                    <div className="forum-layout__create">
                        <CreatePostForm onCreate={handleCreate}/>
                    </div>

                    <div className="forum-layout__feed">
                        <div className="forum-feed-header">
                            <div>
                                <h2>Posts</h2>
                                <p className="forum-feed-header__subtitle">{feedSubtitle}</p>
                            </div>

                            <form className="forum-filter" onSubmit={applyTagFilter}>
                                <div style={{display: 'flex', gap: '8px'}}>
                                    <input
                                        type="text"
                                        value={tagDraft}
                                        onChange={(event) => setTagDraft(event.target.value)}
                                        placeholder="Filter by tag..."
                                        className="forum-filter__input"
                                    />
                                    <button type="submit" className="forum-button forum-button--secondary"
                                            style={{whiteSpace: 'nowrap'}}>
                                        Filter
                                    </button>
                                    {activeTagFilter && (
                                        <button type="button" className="forum-button forum-button--ghost"
                                                onClick={clearTagFilter} style={{whiteSpace: 'nowrap'}}>
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>

                        <PostFeed reloadKey={reloadKey} tagFilter={activeTagFilter}/>
                    </div>
                </div>
            </div>
        </main>
    )
}


