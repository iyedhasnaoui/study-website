import { useState, useEffect } from 'react'

export interface TagItem {
    id: number
    name: string
}

interface TagAutocompleteProps {
    selectedTags: TagItem[]
    onChange: (tags: TagItem[]) => void
    placeholder?: string
    label?: string
}

export function TagAutocomplete({
                                    selectedTags,
                                    onChange,
                                    placeholder = 'Type to search existing tags...',
                                    label = 'Tags',
                                }: TagAutocompleteProps) {
    const [availableTags, setAvailableTags] = useState<TagItem[]>([])
    const [tagInput, setTagInput] = useState('')
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)

    useEffect(() => {
        fetch('http://localhost:8080/api/tags')
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`)
                }
                return res.json()
            })
            .then((data: TagItem[]) => {
                setAvailableTags(data)
            })
            .catch((err) => console.error('Failed to load tags', err))
    }, [])

    // Filter available tags matching user input, excluding already selected tag IDs
    const filteredTags = availableTags.filter(
        (tag) =>
            tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
            !selectedTags.some((selected) => selected.id === tag.id)
    )

    const addTag = (tagToAdd: TagItem) => {
        onChange([...selectedTags, tagToAdd])
        setTagInput('')
        setIsDropdownOpen(false)
    }

    const removeTag = (tagIdToRemove: number) => {
        onChange(selectedTags.filter((tag) => tag.id !== tagIdToRemove))
    }

    return (
        <div className="relative space-y-2">
            {label && (
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
                    {label}
                </label>
            )}

            {/* Selected Tags Pills */}
            <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map((tag) => (
                    <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    >
            #{tag.name}
                        <button
                            type="button"
                            onClick={() => removeTag(tag.id)}
                            className="hover:text-amber-600 dark:hover:text-amber-100"
                        >
              ×
            </button>
          </span>
                ))}
            </div>

            {/* Input Field */}
            <input
                type="text"
                value={tagInput}
                onChange={(e) => {
                    setTagInput(e.target.value)
                    setIsDropdownOpen(true)
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-amber-400"
            />

            {/* Dropdown Options */}
            {isDropdownOpen && filteredTags.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                    {filteredTags.map((tag) => (
                        <li
                            key={tag.id}
                            onClick={() => addTag(tag)}
                            className="cursor-pointer px-4 py-2 text-sm text-slate-700 hover:bg-amber-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            #{tag.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}