import {useState, useEffect} from 'react'
import {createForumPost} from './api/forumApi'
import {CreatePostForm} from './components/CreatePostForm'
import {getTags} from './api/forumApi'
import type {ForumPostCreateDto} from './types'

interface CreatePostPageProps {
    onBackToFeed: () => void
    onCreated: () => void
}

export function CreatePostPage({onBackToFeed, onCreated}: CreatePostPageProps) {
    const handleCreate = async (payload: ForumPostCreateDto, files: File[]) => {
        await createForumPost(payload, undefined, files)
        onCreated()
    }

    // --- Autcomplete Tag Selector ---
    const [availableTags, setAvailableTags] = useState<string[]>([])
    const [tagInput, setTagInput] = useState('')
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)

    useEffect(() => {
        getTags()
            .then((tags) => setAvailableTags(tags))
            .catch((err) => console.error('Failed to load tags', err))
    }, [])

    // Filter options based on user input, excluding already selected ones
    const filteredTags = availableTags.filter(
        (tag) =>
            tag.toLowerCase().includes(tagInput.toLowerCase()) &&
            !selectedTags.includes(tag)
    )

    const addTag = (tag: string) => {
        setSelectedTags((prev) => [...prev, tag])
        setTagInput('')
        setIsDropdownOpen(false)
    }

    const removeTag = (tagToRemove: string) => {
        setSelectedTags((prev) => prev.filter((t) => t !== tagToRemove))
    }


    return (
        <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
            <section
                className="mb-8 rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-300">
                            Forum
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">New
                            post</h1>
                        <p className="max-w-2xl text-sm text-slate-500 dark:text-zinc-400">
                            Compose a new discussion topic for the community.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-amber-500/50 dark:hover:text-amber-200"
                        onClick={onBackToFeed}
                    >
                        Back to feed
                    </button>
                </div>
            </section>

            <CreatePostForm onCreate={handleCreate} tagSelectorUI={
                <div className="relative space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
                        Tags
                    </label>

                    {/* Selected Tags Pills */}
                    <div className="flex flex-wrap gap-2 mb-2">
                        {selectedTags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                            >
                  #{tag}
                                <button
                                    type="button"
                                    onClick={() => removeTag(tag)}
                                    className="hover:text-amber-600 dark:hover:text-amber-100"
                                >
                    ×
                  </button>
                </span>
                        ))}
                    </div>

                    {/* Input with Dropdown */}
                    <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => {
                            setTagInput(e.target.value)
                            setIsDropdownOpen(true)
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        placeholder="Type to search existing tags..."
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-amber-400"
                    />

                    {/* Suggestions Dropdown Menu */}
                    {isDropdownOpen && filteredTags.length > 0 && (
                        <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                            {filteredTags.map((tag) => (
                                <li
                                    key={tag}
                                    onClick={() => addTag(tag)}
                                    className="cursor-pointer px-4 py-2 text-sm text-slate-700 hover:bg-amber-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                >
                                    #{tag}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            }/>
        </main>
    )
}

