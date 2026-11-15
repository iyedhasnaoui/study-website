import { useState, useEffect, useId, useRef } from 'react'
import { getApprovedRoadmapTitles, type ApprovedRoadmapItem } from '../features/zitouna/api'

interface RoadmapAutocompleteProps {
    value: string
    onChange: (value: string) => void
    label?: string
    placeholder?: string
}

/**
 * Same interaction pattern as TagAutocomplete (load once, filter client-side, combobox/listbox
 * with arrow-key navigation, outside-click close), but for a single free-text value: picking a
 * suggestion fills in the approved roadmap's title; unmatched text is kept as typed.
 */
export function RoadmapAutocomplete({
                                        value,
                                        onChange,
                                        label = 'Roadmap followed',
                                        placeholder = 'Type to search approved roadmaps...',
                                    }: RoadmapAutocompleteProps) {
    const [roadmaps, setRoadmaps] = useState<ApprovedRoadmapItem[]>([])
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const dropdownId = useId()
    const containerRef = useRef<HTMLLabelElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        let active = true
        getApprovedRoadmapTitles()
            .then((data) => { if (active) setRoadmaps(data) })
            .catch((err) => console.error('Failed to load roadmaps', err))
        return () => { active = false }
    }, [])

    useEffect(() => {
        const closeOnOutsideClick = (event: PointerEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setIsDropdownOpen(false)
        }
        document.addEventListener('pointerdown', closeOnOutsideClick)
        return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
    }, [])

    const needle = value.trim().toLowerCase()
    const filtered = roadmaps.filter((roadmap) =>
        roadmap.title.toLowerCase().includes(needle) && roadmap.title !== value)

    const select = (roadmap: ApprovedRoadmapItem) => {
        onChange(roadmap.title)
        setIsDropdownOpen(false)
        inputRef.current?.focus()
    }

    return (
        <label ref={containerRef} style={{position: 'relative'}}>
            {label}
            <input
                ref={inputRef}
                type="text"
                value={value}
                maxLength={3000}
                onChange={(event) => {
                    onChange(event.target.value)
                    setIsDropdownOpen(true)
                }}
                onFocus={() => setIsDropdownOpen(true)}
                aria-expanded={isDropdownOpen}
                aria-controls={dropdownId}
                aria-autocomplete="list"
                role="combobox"
                onKeyDown={(event) => {
                    if (event.key === 'Escape') setIsDropdownOpen(false)
                    if (event.key === 'ArrowDown' && filtered.length > 0) {
                        event.preventDefault()
                        setIsDropdownOpen(true)
                        document.getElementById(dropdownId)?.querySelector<HTMLElement>('[role="option"]')?.focus()
                    }
                }}
                placeholder={placeholder}
            />
            {isDropdownOpen && filtered.length > 0 && (
                <ul id={dropdownId} role="listbox" className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900" style={{top: '100%', margin: 0, padding: '4px 0', listStyle: 'none'}}>
                    {filtered.map((roadmap, index) => (
                        <li
                            key={roadmap.id}
                            role="option"
                            aria-selected="false"
                            tabIndex={0}
                            onClick={() => select(roadmap)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault()
                                    select(roadmap)
                                } else if (event.key === 'Escape') {
                                    setIsDropdownOpen(false)
                                    inputRef.current?.focus()
                                } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                                    event.preventDefault()
                                    const options = Array.from(document.getElementById(dropdownId)?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])
                                    const nextIndex = index + (event.key === 'ArrowDown' ? 1 : -1)
                                    if (nextIndex >= 0 && nextIndex < options.length) options[nextIndex].focus()
                                    else if (event.key === 'ArrowUp' && nextIndex < 0) inputRef.current?.focus()
                                }
                            }}
                            className="cursor-pointer px-4 py-2 text-sm text-slate-700 hover:bg-amber-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            style={{padding: '8px 14px', fontWeight: 500}}
                        >
                            {roadmap.title}
                        </li>
                    ))}
                </ul>
            )}
        </label>
    )
}
