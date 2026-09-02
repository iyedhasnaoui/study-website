import {useState, useEffect} from 'react'
import {createForumPost, getForumTopics} from './api/forumApi'
import {CreatePostForm} from './components/CreatePostForm'
import type {ForumPostCreateDto, ForumTopicResponseDto} from './types'

interface CreatePostPageProps {
    onBackToFeed: () => void
    onCreated: () => void
}

export function CreatePostPage({onBackToFeed, onCreated}: CreatePostPageProps) {

    const [topics, setTopics] = useState<ForumTopicResponseDto[]>([])
    const [isLoadingTopics, setIsLoadingTopics] = useState(true)

    useEffect(() => {
        let isMounted = true

        const loadTopics = async () => {
            try {
                const data = await getForumTopics()
                if (isMounted) setTopics(data)
            } catch (err) {
                console.error('Failed to load topics:', err)
            } finally {
                if (isMounted) setIsLoadingTopics(false)
            }
        }

        void loadTopics()
        return () => {
            isMounted = false
        }
    }, [])

    const handleCreate = async (payload: ForumPostCreateDto) => {
        await createForumPost(payload)
        onCreated()
    }

    return (
        <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
            <section
                className="mb-8 rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-600 dark:text-violet-300">
                            Forum
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">New
                            post</h1>
                        <p className="max-w-2xl text-sm text-slate-500 dark:text-zinc-400">
                            Create a new topic.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-violet-500/50 dark:hover:text-violet-200"
                        onClick={onBackToFeed}
                    >
                        Back to feed
                    </button>
                </div>
            </section>

            <CreatePostForm topics={topics}
                            isLoadingTopics={isLoadingTopics}
                            onCreate={handleCreate}/>
        </main>
    )
}

