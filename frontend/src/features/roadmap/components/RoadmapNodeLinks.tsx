import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { getZitounaFeed } from '../../zitouna/api'
import type { FeedItem } from '../../zitouna/types'
import {
  acceptsVouches,
  externalLink,
  feedItemToLink,
  isSameTarget,
  linkHref,
  linkText,
  normaliseWebAddress,
  suggestionToLink,
  TARGET_LABELS,
  vouchText,
} from '../nodeLinks'
import type {
  RoadmapLinkSuggestion,
  RoadmapNodeLink,
  RoadmapNodeType,
  RoadmapNodeVouch,
} from '../types'

const SUGGESTIONS_SHOWN = 6
const SEARCH_RESULTS_SHOWN = 8

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-amber-400 dark:focus:ring-amber-500/20'

const chipBase = 'inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-xs'

const addButtonClass =
  'rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-500 transition hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-amber-500/60 dark:hover:text-amber-200'

function SectionHeading({ title, hint, className }: { title: string; hint: string; className: string }) {
  return (
    <p className={`text-[11px] font-bold uppercase tracking-wide ${className}`}>
      {title}
      <span className="ml-1 font-normal normal-case tracking-normal text-slate-400 dark:text-zinc-500">
        — {hint}
      </span>
    </p>
  )
}

function LinkAnchor({ link, newTabAlways }: { link: RoadmapNodeLink; newTabAlways: boolean }) {
  const { href, newTab } = linkHref(link)
  const opensElsewhere = newTab || newTabAlways
  return (
    <a
      href={href}
      target={opensElsewhere ? '_blank' : undefined}
      rel={opensElsewhere ? 'noopener noreferrer' : undefined}
      className="min-w-0 truncate hover:underline"
      title={link.available ? linkText(link) : 'No longer available on Zitun'}
    >
      {link.kind === 'EXTERNAL' ? '↗ ' : ''}
      {linkText(link)}
    </a>
  )
}

function chipTone(link: RoadmapNodeLink): string {
  if (!link.available) {
    return 'border-rose-300 bg-rose-50 text-rose-700 line-through dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
  }
  return link.insideTag
    ? 'border-amber-600/60 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-950/40 dark:text-amber-100'
    : 'border-slate-700 bg-white text-slate-800 dark:border-zinc-500 dark:bg-zinc-950 dark:text-zinc-100'
}

function RemovableChip({
  className,
  label,
  onRemove,
  children,
}: {
  className: string
  label: string
  onRemove: () => void
  children: ReactNode
}) {
  return (
    <span className={`${chipBase} ${className}`}>
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="shrink-0 rounded-full px-1 leading-none opacity-60 transition hover:opacity-100"
      >
        ✕
      </button>
    </span>
  )
}

const VOUCH_TONES: Record<RoadmapNodeVouch['status'], string> = {
  APPROVED:
    'border-emerald-600/60 bg-emerald-50 font-semibold text-emerald-800 dark:border-emerald-500/50 dark:bg-emerald-950/40 dark:text-emerald-200',
  PENDING:
    'border-amber-300 bg-white text-slate-700 dark:border-amber-700/60 dark:bg-zinc-950 dark:text-zinc-200',
  NEEDS_FIXING:
    'border-amber-300 bg-white text-slate-700 dark:border-amber-700/60 dark:bg-zinc-950 dark:text-zinc-200',
  REJECTED:
    'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
}

const VOUCH_STATE: Record<RoadmapNodeVouch['status'], string> = {
  APPROVED: '',
  PENDING: ' · waiting for an admin',
  NEEDS_FIXING: ' · waiting for an admin',
  REJECTED: ' · rejected by an admin',
}

// --- editing -------------------------------------------------------------------

interface NodeLinksEditorProps {
  roadmapId: number
  nodeType: RoadmapNodeType
  links: RoadmapNodeLink[]
  vouches: RoadmapNodeVouch[]
  /** null while loading */
  suggestions: RoadmapLinkSuggestion[] | null
  suggestionsError: string | null
  roadmapHasTags: boolean
  onLinksChange: (links: RoadmapNodeLink[]) => void
  onVouchesChange: (vouches: RoadmapNodeVouch[]) => void
}

/**
 * The links part of the node panel. Inside the tag: Zitun content with the roadmap's tags, offered
 * by the website and picked by the editor. Outside the tag: anything added by hand. Vouched by:
 * people who did the step, shown to readers only once an admin accepts them.
 */
export function NodeLinksEditor({
  roadmapId,
  nodeType,
  links,
  vouches,
  suggestions,
  suggestionsError,
  roadmapHasTags,
  onLinksChange,
  onVouchesChange,
}: NodeLinksEditorProps) {
  const [showAllSuggestions, setShowAllSuggestions] = useState(false)

  const insideLinks = links.filter((link) => link.insideTag && link.available)
  const outsideLinks = links.filter((link) => !link.insideTag || !link.available)
  const offered = (suggestions ?? []).filter(
    (suggestion) => !links.some((link) => isSameTarget(link, suggestion.targetType, suggestion.targetId)),
  )
  const visibleOffers = showAllSuggestions ? offered : offered.slice(0, SUGGESTIONS_SHOWN)

  const removeLink = (removed: RoadmapNodeLink) => onLinksChange(links.filter((link) => link !== removed))
  const addLink = (added: RoadmapNodeLink) => onLinksChange([...links, added])

  const insideTagHint = suggestionsError
    ? suggestionsError
    : suggestions === null
      ? 'Looking for content with the same tags…'
      : !roadmapHasTags
        ? 'This roadmap has no tags yet, so the website has nothing to suggest.'
        : offered.length === 0 && insideLinks.length === 0
          ? 'Nothing on Zitun carries all of this roadmap’s tags yet.'
          : null

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 p-3 dark:border-zinc-800">
      <p className="text-xs font-semibold text-slate-600 dark:text-zinc-300">Links</p>

      <section className="space-y-2" aria-label="Links inside the tag">
        <SectionHeading
          title="Inside the tag"
          hint="same tags as the roadmap, suggested by the website"
          className="text-amber-700 dark:text-amber-300"
        />
        <div className="flex flex-wrap gap-1.5">
          {insideLinks.map((link) => (
            <RemovableChip
              key={`${link.targetType}-${link.targetId}`}
              className={chipTone(link)}
              label={linkText(link)}
              onRemove={() => removeLink(link)}
            >
              <LinkAnchor link={link} newTabAlways />
            </RemovableChip>
          ))}
          {visibleOffers.map((suggestion) => (
            <button
              key={`${suggestion.targetType}-${suggestion.targetId}`}
              type="button"
              onClick={() => addLink(suggestionToLink(suggestion))}
              title="Add this link to the step"
              className={`${chipBase} border-dashed border-amber-400 text-amber-800 transition hover:bg-amber-50 dark:border-amber-600/60 dark:text-amber-200 dark:hover:bg-amber-950/40`}
            >
              <span className="truncate">+ {linkText(suggestionToLink(suggestion))}</span>
            </button>
          ))}
          {offered.length > SUGGESTIONS_SHOWN ? (
            <button
              type="button"
              onClick={() => setShowAllSuggestions((current) => !current)}
              className="px-1 text-xs font-semibold text-amber-700 underline dark:text-amber-300"
            >
              {showAllSuggestions ? 'Show fewer' : `${offered.length - SUGGESTIONS_SHOWN} more`}
            </button>
          ) : null}
        </div>
        {insideTagHint ? <p className="text-xs text-slate-400 dark:text-zinc-500">{insideTagHint}</p> : null}
      </section>

      <section className="space-y-2" aria-label="Links outside the tag">
        <SectionHeading
          title="Outside the tag"
          hint="added by hand"
          className="text-slate-700 dark:text-zinc-200"
        />
        <div className="flex flex-wrap gap-1.5">
          {outsideLinks.map((link) => (
            <RemovableChip
              key={link.kind === 'EXTERNAL' ? link.url : `${link.targetType}-${link.targetId}`}
              className={chipTone(link)}
              label={linkText(link)}
              onRemove={() => removeLink(link)}
            >
              <LinkAnchor link={link} newTabAlways />
            </RemovableChip>
          ))}
        </div>
        <AddLinkForm roadmapId={roadmapId} links={links} suggestions={suggestions ?? []} onAdd={addLink} />
      </section>

      {acceptsVouches(nodeType) ? (
        <VouchesEditor vouches={vouches} onChange={onVouchesChange} />
      ) : vouches.length > 0 ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Only steps can be vouched for. The {vouches.length === 1 ? 'person' : `${vouches.length} people`} named
          on this node will be dropped when you save.
        </p>
      ) : null}
    </div>
  )
}

function AddLinkForm({
  roadmapId,
  links,
  suggestions,
  onAdd,
}: {
  roadmapId: number
  links: RoadmapNodeLink[]
  suggestions: RoadmapLinkSuggestion[]
  onAdd: (link: RoadmapNodeLink) => void
}) {
  const [mode, setMode] = useState<'closed' | 'zitun' | 'web'>('closed')
  const [query, setQuery] = useState('')
  // Results remember the query they answer, so a stale answer is never shown for a newer query.
  const [searched, setSearched] = useState<{ query: string; items: FeedItem[]; error: string | null } | null>(null)
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)

  const term = query.trim()
  const shouldSearch = mode === 'zitun' && term.length >= 2
  const answered = shouldSearch && searched?.query === term ? searched : null
  const isSearching = shouldSearch && answered === null
  const searchError = answered?.error ?? null

  useEffect(() => {
    if (!shouldSearch) return
    let active = true
    const timer = window.setTimeout(async () => {
      try {
        const found = await getZitounaFeed({ query: term })
        if (active) setSearched({ query: term, items: Array.isArray(found) ? found : found.content, error: null })
      } catch {
        if (active) setSearched({ query: term, items: [], error: 'Searching Zitun failed. Try again.' })
      }
    }, 250)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [shouldSearch, term])

  const hits = useMemo(
    () =>
      (answered?.items ?? [])
        .filter((item) => !(item.area === 'ROADMAP' && item.id === roadmapId))
        .filter((item) => !links.some((link) => isSameTarget(link, item.area, item.id)))
        .slice(0, SEARCH_RESULTS_SHOWN),
    [answered, links, roadmapId],
  )

  const close = () => {
    setMode('closed')
    setQuery('')
    setUrl('')
    setLabel('')
    setUrlError(null)
  }

  const addWebPage = () => {
    const address = normaliseWebAddress(url)
    if (!address) {
      setUrlError('Enter a web address, for example https://www.tum.de/…')
      return
    }
    if (links.some((link) => link.kind === 'EXTERNAL' && link.url === address)) {
      setUrlError('This page is already linked.')
      return
    }
    onAdd(externalLink(address, label))
    close()
  }

  if (mode === 'closed') {
    return (
      <button type="button" onClick={() => setMode('zitun')} className={addButtonClass}>
        + add a link
      </button>
    )
  }

  const tabClass = (active: boolean) =>
    [
      'rounded-full px-2.5 py-1 text-xs font-semibold transition',
      active
        ? 'bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-900'
        : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-900',
    ].join(' ')

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-2.5 dark:border-zinc-800">
      <div className="flex items-center gap-1" role="group" aria-label="Kind of link">
        <button type="button" onClick={() => setMode('zitun')} aria-pressed={mode === 'zitun'} className={tabClass(mode === 'zitun')}>
          On Zitun
        </button>
        <button type="button" onClick={() => setMode('web')} aria-pressed={mode === 'web'} className={tabClass(mode === 'web')}>
          Web page
        </button>
        <button type="button" onClick={close} className="ml-auto text-xs text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200">
          Cancel
        </button>
      </div>

      {mode === 'zitun' ? (
        <div className="space-y-1.5">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search forum, learning materials, FAQ, roadmaps…"
            aria-label="Search Zitun"
            autoFocus
            className={inputClass}
          />
          {searchError ? <p className="text-xs text-rose-600">{searchError}</p> : null}
          {isSearching ? <p className="text-xs text-slate-400">Searching…</p> : null}
          {answered && hits.length === 0 && !searchError ? (
            <p className="text-xs text-slate-400">Nothing found.</p>
          ) : null}
          <ul className="space-y-1">
            {hits.map((item) => {
              const inside = suggestions.some((s) => s.targetType === item.area && s.targetId === item.id)
              return (
                <li key={`${item.area}-${item.id}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onAdd(feedItemToLink(item, inside))
                      close()
                    }}
                    className="w-full truncate rounded-md px-2 py-1 text-left text-xs text-slate-700 transition hover:bg-amber-50 dark:text-zinc-200 dark:hover:bg-amber-950/40"
                  >
                    <span className="font-semibold">{TARGET_LABELS[item.area]}:</span> {item.title}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <form
          className="space-y-1.5"
          onSubmit={(event) => {
            event.preventDefault()
            addWebPage()
          }}
        >
          <input
            value={url}
            onChange={(event) => {
              setUrl(event.target.value)
              setUrlError(null)
            }}
            placeholder="https://…"
            aria-label="Web address"
            maxLength={2000}
            autoFocus
            className={inputClass}
          />
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="What is it? e.g. lecture series (optional)"
            aria-label="Link title"
            maxLength={200}
            className={inputClass}
          />
          {urlError ? <p className="text-xs text-rose-600">{urlError}</p> : null}
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-700 dark:bg-amber-400 dark:text-slate-900"
          >
            Add link
          </button>
        </form>
      )}
    </div>
  )
}

function VouchesEditor({
  vouches,
  onChange,
}: {
  vouches: RoadmapNodeVouch[]
  onChange: (vouches: RoadmapNodeVouch[]) => void
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [personName, setPersonName] = useState('')
  const [note, setNote] = useState('')

  const close = () => {
    setIsAdding(false)
    setPersonName('')
    setNote('')
  }

  return (
    <section className="space-y-2" aria-label="Vouched by">
      <SectionHeading
        title="Vouched by"
        hint="a person who did it; shown only once an admin accepts"
        className="text-emerald-700 dark:text-emerald-300"
      />
      <div className="flex flex-wrap gap-1.5">
        {vouches.map((vouch, index) => (
          <RemovableChip
            key={vouch.id ?? `new-${index}`}
            className={VOUCH_TONES[vouch.status]}
            label={vouch.personName}
            onRemove={() => onChange(vouches.filter((other) => other !== vouch))}
          >
            <span className="min-w-0 truncate" title={vouchText(vouch)}>
              {vouch.status === 'APPROVED' ? '✓ ' : ''}
              {vouchText(vouch)}
              <span className="font-normal opacity-70">{VOUCH_STATE[vouch.status]}</span>
            </span>
          </RemovableChip>
        ))}
        {!isAdding ? (
          <button type="button" onClick={() => setIsAdding(true)} className={addButtonClass}>
            + add a person
          </button>
        ) : null}
      </div>
      {isAdding ? (
        <form
          className="space-y-1.5 rounded-lg border border-slate-200 p-2.5 dark:border-zinc-800"
          onSubmit={(event) => {
            event.preventDefault()
            if (!personName.trim()) return
            onChange([
              ...vouches,
              { id: null, personName: personName.trim(), note: note.trim() || null, status: 'PENDING' },
            ])
            close()
          }}
        >
          <input
            value={personName}
            onChange={(event) => setPersonName(event.target.value)}
            placeholder="Name"
            aria-label="Name of the person"
            maxLength={120}
            required
            autoFocus
            className={inputClass}
          />
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What they did, e.g. wrote the forum thread (2025)"
            aria-label="What they did"
            maxLength={300}
            className={inputClass}
          />
          <p className="text-[11px] text-slate-400 dark:text-zinc-500">
            Readers see the name only once an admin has accepted it.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-700 dark:bg-amber-400 dark:text-slate-900"
            >
              Add person
            </button>
            <button type="button" onClick={close} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200">
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </section>
  )
}

// --- reading -------------------------------------------------------------------

/** What a reader sees: the links to follow, and who confirmed the step. */
export function NodeLinksReader({ links, vouches }: { links: RoadmapNodeLink[]; vouches: RoadmapNodeVouch[] }) {
  const usable = links.filter((link) => link.available)
  const inside = usable.filter((link) => link.insideTag)
  const outside = usable.filter((link) => !link.insideTag)
  const confirmed = vouches.filter((vouch) => vouch.status === 'APPROVED')

  if (usable.length === 0 && confirmed.length === 0) return null

  const list = (items: RoadmapNodeLink[]) => (
    <ul className="space-y-1">
      {items.map((link) => (
        <li key={link.kind === 'EXTERNAL' ? link.url : `${link.targetType}-${link.targetId}`} className="flex text-sm text-sky-700 dark:text-sky-300">
          <LinkAnchor link={link} newTabAlways={false} />
        </li>
      ))}
    </ul>
  )

  return (
    <div className="space-y-3">
      {inside.length > 0 ? (
        <section className="space-y-1.5" aria-label="Same tags on Zitun">
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Same tags on Zitun
          </p>
          {list(inside)}
        </section>
      ) : null}
      {outside.length > 0 ? (
        <section className="space-y-1.5" aria-label="More links">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-zinc-300">More links</p>
          {list(outside)}
        </section>
      ) : null}
      {confirmed.length > 0 ? (
        <p className="text-sm text-emerald-800 dark:text-emerald-200">
          <span className="font-semibold">✓ Confirmed by </span>
          {confirmed.map(vouchText).join('; ')}
        </p>
      ) : null}
    </div>
  )
}
