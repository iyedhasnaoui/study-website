import { useState, useEffect } from 'react'
import { getTags, TAGS_UPDATED_EVENT } from '../features/zitouna/api'

export type TagField = 'INSTITUTION' | 'PROGRAM' | 'TOPIC' | 'SUBTOPIC'

export interface TagItem {
    id: number
    name: string
    field?: TagField
    parentId?: number | null
}

export interface TagProposalItem {
    name: string
    field: TagField
    parentId?: number | null
}

interface TagAutocompleteProps {
    selectedTags: TagItem[]
    onChange: (tags: TagItem[]) => void
    proposals?: TagProposalItem[]
    onProposalsChange?: (proposals: TagProposalItem[]) => void
    allowProposals?: boolean
    placeholder?: string
    label?: string
}

export function TagAutocomplete({
                                    selectedTags,
                                    onChange,
                                    proposals = [],
                                    onProposalsChange,
                                    allowProposals = false,
                                    placeholder = 'Type to search existing tags...',
                                    label = 'Tags',
                                }: TagAutocompleteProps) {
    const [availableTags, setAvailableTags] = useState<TagItem[]>([])
    const [tagInput, setTagInput] = useState('')
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [proposalField, setProposalField] = useState<TagField>('TOPIC')
    const [proposalParentId, setProposalParentId] = useState('')

    useEffect(() => {
        let active = true
        const loadTags = () => {
            getTags()
                .then((data) => {
                    if (active) setAvailableTags(data)
                })
                .catch((err) => console.error('Failed to load tags', err))
        }

        loadTags()
        window.addEventListener(TAGS_UPDATED_EVENT, loadTags)
        return () => {
            active = false
            window.removeEventListener(TAGS_UPDATED_EVENT, loadTags)
        }
    }, [])

    // Filter available tags matching user input, excluding already selected tag IDs
    const filteredTags = availableTags.filter(
        (tag) =>
            tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
            !selectedTags.some((selected) => selected.id === tag.id)
    )
    const topicParents = availableTags.filter((tag) => tag.field === 'TOPIC'
        || (tag.field === 'SUBTOPIC' && availableTags.some((parent) => parent.id === tag.parentId && parent.field === 'TOPIC')))
    const proposalAlreadyExists = availableTags.some((tag) => tag.name.trim().toLocaleLowerCase() === tagInput.trim().toLocaleLowerCase()
        && tag.field === proposalField
        && (proposalField !== 'SUBTOPIC' || tag.parentId === Number(proposalParentId)))

    const addTag = (tagToAdd: TagItem) => {
        onChange([...selectedTags, tagToAdd])
        setTagInput('')
        setIsDropdownOpen(false)
    }

    const removeTag = (tagIdToRemove: number) => {
        onChange(selectedTags.filter((tag) => tag.id !== tagIdToRemove))
    }

    const addProposal = () => {
        const name = tagInput.trim()
        if (!name || !onProposalsChange || proposalAlreadyExists) return
        if (proposalField === 'SUBTOPIC' && !proposalParentId) return
        if (proposals.some((proposal) => proposal.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase()
            && proposal.field === proposalField && (proposal.parentId ?? null) === (proposalField === 'SUBTOPIC' ? Number(proposalParentId) : null))) return
        onProposalsChange([...proposals, {
            name,
            field: proposalField,
            parentId: proposalField === 'SUBTOPIC' ? Number(proposalParentId) : null,
        }])
        setTagInput('')
        setProposalParentId('')
        setIsDropdownOpen(false)
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
                {proposals.map((proposal, index) => (
                    <span
                        key={`${proposal.field}-${proposal.parentId ?? 'root'}-${proposal.name}-${index}`}
                        className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800 dark:bg-sky-900/40 dark:text-sky-300"
                    >
                        {proposal.name} · proposed
                        <button
                            type="button"
                            onClick={() => onProposalsChange?.(proposals.filter((_, proposalIndex) => proposalIndex !== index))}
                            className="hover:text-sky-600 dark:hover:text-sky-100"
                            aria-label={`Remove proposed tag ${proposal.name}`}
                        >×</button>
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
            {allowProposals && onProposalsChange && tagInput.trim() ? (
                <div className="space-y-2 rounded-xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-900/60 dark:bg-sky-950/30">
                    <p className="text-xs text-slate-600 dark:text-zinc-300">Can’t find this tag? Propose it with your submission.</p>
                    <div className="flex flex-wrap gap-2">
                        <select
                            aria-label="Proposed tag field"
                            value={proposalField}
                            onChange={(event) => {
                                setProposalField(event.target.value as TagField)
                                setProposalParentId('')
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        >
                            <option value="INSTITUTION">Institution</option>
                            <option value="PROGRAM">Program / position</option>
                            <option value="TOPIC">Topic</option>
                            <option value="SUBTOPIC">Subtopic</option>
                        </select>
                        {proposalField === 'SUBTOPIC' ? (
                            <select
                                aria-label="Proposed subtopic parent"
                                required
                                value={proposalParentId}
                                onChange={(event) => setProposalParentId(event.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                            >
                                <option value="">Choose an approved topic or subtopic</option>
                                {topicParents.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}
                            </select>
                        ) : null}
                        <button
                            type="button"
                            disabled={proposalAlreadyExists || (proposalField === 'SUBTOPIC' && !proposalParentId)}
                            onClick={addProposal}
                            className="rounded-lg bg-sky-700 px-3 py-1 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >Propose “{tagInput.trim()}”</button>
                    </div>
                    {proposalAlreadyExists ? <p className="text-xs text-rose-700 dark:text-rose-300">An approved tag with this name already exists.</p> : null}
                </div>
            ) : null}
        </div>
    )
}