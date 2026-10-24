import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { useAuth } from '../../auth/AuthContext'
import { getApiErrorMessage, resolveApiUrl } from '../../lib/apiClient'
import {
  createFaq,
  createTagType,
  decideTag,
  getFaq,
  getLearningMaterials,
  getModerationQueue,
  getTagProposals,
  getTags,
  getTagTypes,
  getZitounaFeed,
  moderate,
  proposeTag,
  submitLearningMaterial,
} from './api'
import type {
  FaqEntry,
  FeedArea,
  FeedItem,
  LearningMaterial,
  ModerationQueueItem,
  TagField,
  TagTypeDefinition,
  TagTypePayload,
  ZitounaTag,
} from './types'
import './zitouna.css'

type ZitounaTab = 'discover' | 'materials' | 'faq' | 'admin'

interface ZitounaPageProps {
  onCreatePost: () => void
  onOpenForum: () => void
  onOpenRoadmaps: () => void
  onRequireLogin: () => void
}

const areaLabels: Record<FeedArea, string> = {
  FORUM: 'Forum',
  ROADMAP: 'Roadmaps',
  LEARNING_MATERIAL: 'Learning materials',
  FAQ: 'FAQ',
}

const fieldLabels: Record<TagField, string> = {
  INSTITUTION: 'Institution',
  PROGRAM: 'Program / position',
  TOPIC: 'Topic',
  SUBTOPIC: 'Subtopic',
}

const allAreas = Object.keys(areaLabels) as FeedArea[]

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function ZitounaPage({ onCreatePost, onOpenForum, onOpenRoadmaps, onRequireLogin }: ZitounaPageProps) {
  const { session } = useAuth()
  const isAdmin = Boolean(session?.user.roles?.includes('ADMIN'))
  const [tab, setTab] = useState<ZitounaTab>('discover')
  const [tags, setTags] = useState<ZitounaTag[]>([])
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [areas, setAreas] = useState<FeedArea[]>(allAreas)
  const [queryDraft, setQueryDraft] = useState('')
  const [query, setQuery] = useState('')
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [materials, setMaterials] = useState<LearningMaterial[]>([])
  const [faq, setFaq] = useState<FaqEntry[]>([])
  const [queue, setQueue] = useState<ModerationQueueItem[]>([])
  const [proposals, setProposals] = useState<ZitounaTag[]>([])
  const [tagTypes, setTagTypes] = useState<TagTypeDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [proposalOpen, setProposalOpen] = useState(false)
  const [proposal, setProposal] = useState<{ name: string; field: TagField; parentId: string }>({ name: '', field: 'TOPIC', parentId: '' })

  useEffect(() => {
    getTags().then(setTags).catch((reason) => setError(getApiErrorMessage(reason, 'Unable to load tags.')))
  }, [])

  useEffect(() => {
    if (tab !== 'discover') return
    let active = true
    setLoading(true)
    setError(null)
    getZitounaFeed({ query, areas, tagIds: selectedTags })
      .then((items) => active && setFeed(items))
      .catch((reason) => active && setError(getApiErrorMessage(reason, 'Unable to load Zitouna.')))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [areas, query, selectedTags, tab])

  useEffect(() => {
    if (tab !== 'materials') return
    setLoading(true)
    Promise.resolve(getLearningMaterials(Boolean(session)))
      .then(setMaterials)
      .catch((reason) => setError(getApiErrorMessage(reason, 'Unable to load learning materials.')))
      .finally(() => setLoading(false))
  }, [session, tab])

  useEffect(() => {
    if (tab !== 'faq') return
    setLoading(true)
    getFaq().then(setFaq)
      .catch((reason) => setError(getApiErrorMessage(reason, 'Unable to load the FAQ.')))
      .finally(() => setLoading(false))
  }, [tab])

  const loadAdmin = async () => {
    if (!isAdmin) return
    setLoading(true)
    try {
      const [nextQueue, nextProposals, nextTypes] = await Promise.all([
        getModerationQueue(), getTagProposals(), getTagTypes(),
      ])
      setQueue(nextQueue)
      setProposals(nextProposals)
      setTagTypes(nextTypes)
    } catch (reason) {
      setError(getApiErrorMessage(reason, 'Unable to load the admin queue.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'admin') void loadAdmin()
  }, [tab, isAdmin])

  const groupedTags = useMemo(() => {
    const groups = new Map<TagField, ZitounaTag[]>()
    tags.forEach((tag) => groups.set(tag.field, [...(groups.get(tag.field) ?? []), tag]))
    return groups
  }, [tags])

  const tagSelection = useMemo(() => {
    const selected = tags.filter((tag) => selectedTags.includes(tag.id))
    const ids = (field: TagField) => selected.filter((tag) => tag.field === field).map((tag) => tag.id)
    const institutions = ids('INSTITUTION')
    return {
      homeInstitutionId: institutions[0] ?? null,
      partnerInstitutionId: institutions[1] ?? null,
      institutionIds: institutions,
      programIds: ids('PROGRAM'),
      topicIds: ids('TOPIC'),
      subtopicIds: ids('SUBTOPIC'),
      proposals: [],
    }
  }, [selectedTags, tags])

  const startPost = () => {
    if (!session) {
      onRequireLogin()
      return
    }
    const selected = tags.filter((tag) => selectedTags.includes(tag.id))
    window.sessionStorage.setItem('iac.zitouna.post-prefill', JSON.stringify({ tags: selected, tagSelection }))
    onCreatePost()
  }

  const openFeedItem = (item: FeedItem) => {
    if (item.area === 'FORUM') onOpenForum()
    else if (item.area === 'ROADMAP') onOpenRoadmaps()
    else if (item.area === 'LEARNING_MATERIAL' && item.contentUrl) window.open(resolveApiUrl(item.contentUrl), '_blank', 'noopener,noreferrer')
    else setTab('faq')
  }

  return (
    <main className="zitouna-page">
      <section className="zitouna-hero section-shell">
        <div>
          <p className="eyebrow">IAC set of tools</p>
          <h1>Zitouna</h1>
          <p>One searchable circle for roadmaps, discussions, learning materials, and answers — organised by tags, never buried in folders.</p>
        </div>
        <div className="zitouna-hero__mark"><img src="/assets/iac-logo.jpeg" alt="IAC palm tree" /></div>
      </section>

      <nav className="zitouna-tabs section-shell" aria-label="Zitouna sections">
        {(['discover', 'materials', 'faq'] as ZitounaTab[]).map((name) => (
          <button key={name} className={tab === name ? 'is-active' : ''} type="button" onClick={() => setTab(name)}>
            {name === 'discover' ? 'Discover' : name === 'materials' ? 'Learning materials' : 'FAQ'}
          </button>
        ))}
        {isAdmin ? <button className={tab === 'admin' ? 'is-active' : ''} type="button" onClick={() => setTab('admin')}>Admin queue</button> : null}
      </nav>

      {notice ? <div className="zitouna-notice section-shell" role="status">{notice}</div> : null}
      {error ? <div className="zitouna-error section-shell" role="alert">{error}</div> : null}

      {tab === 'discover' ? (
        <section className="zitouna-workspace section-shell">
          <aside className="filter-panel">
            <div className="filter-panel__heading"><span>Filters</span><button type="button" onClick={() => setSelectedTags([])}>Clear</button></div>
            {[...groupedTags.entries()].map(([field, values]) => (
              <fieldset key={field}>
                <legend>{fieldLabels[field]}</legend>
                {values.map((tag) => (
                  <label key={tag.id}>
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag.id)}
                      onChange={() => setSelectedTags((current) => current.includes(tag.id)
                        ? current.filter((id) => id !== tag.id)
                        : [...current, tag.id])}
                    />
                    <span>{tag.name}</span>
                  </label>
                ))}
              </fieldset>
            ))}
            <button className="filter-panel__proposal" type="button" onClick={() => session ? setProposalOpen((current) => !current) : onRequireLogin()}>
              Missing a tag? Propose it
            </button>
            {proposalOpen ? (
              <form className="tag-proposal-form" onSubmit={async (event) => {
                event.preventDefault()
                try {
                  await proposeTag({
                    name: proposal.name.trim(),
                    field: proposal.field,
                    parentId: proposal.field === 'SUBTOPIC' && proposal.parentId ? Number(proposal.parentId) : undefined,
                  })
                  setProposal({ name: '', field: 'TOPIC', parentId: '' })
                  setProposalOpen(false)
                  setNotice('Your tag suggestion is waiting for admin approval.')
                } catch (reason) {
                  setError(getApiErrorMessage(reason, 'Unable to propose this tag.'))
                }
              }}>
                <input required maxLength={120} value={proposal.name} onChange={(event) => setProposal({ ...proposal, name: event.target.value })} placeholder="Tag name" />
                <select value={proposal.field} onChange={(event) => setProposal({ ...proposal, field: event.target.value as TagField, parentId: '' })}>
                  {(Object.keys(fieldLabels) as TagField[]).map((field) => <option key={field} value={field}>{fieldLabels[field]}</option>)}
                </select>
                {proposal.field === 'SUBTOPIC' ? (
                  <select required value={proposal.parentId} onChange={(event) => setProposal({ ...proposal, parentId: event.target.value })}>
                    <option value="">Parent topic</option>
                    {tags.filter((tag) => tag.field === 'TOPIC' || tag.field === 'SUBTOPIC').map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
                  </select>
                ) : null}
                <button type="submit">Send suggestion</button>
              </form>
            ) : null}
          </aside>

          <div className="discovery-panel">
            <form className="zitouna-search" onSubmit={(event) => { event.preventDefault(); setQuery(queryDraft.trim()) }}>
              <span aria-hidden="true">⌕</span>
              <input value={queryDraft} onChange={(event) => setQueryDraft(event.target.value)} placeholder="Search by title — e.g. Formelsammlung …" />
              <button type="submit">Search</button>
            </form>

            <div className="area-toolbar">
              <div><b>Show:</b>{allAreas.map((area) => (
                <button
                  type="button"
                  key={area}
                  className={areas.includes(area) ? 'is-active' : ''}
                  onClick={() => setAreas((current) => current.includes(area)
                    ? current.filter((entry) => entry !== area)
                    : [...current, area])}
                >{areaLabels[area]}</button>
              ))}</div>
              <button className="post-button" type="button" onClick={startPost}>+ Post</button>
            </div>

            <div className="feed-list" aria-live="polite">
              {loading ? <p className="empty-state">Gathering the latest contributions…</p> : null}
              {!loading && feed.length === 0 ? <p className="empty-state">Nothing matches these sets yet. Try removing a filter or be the first to contribute.</p> : null}
              {feed.map((item) => (
                <article className={`feed-card feed-card--${item.area.toLowerCase()}`} key={`${item.area}-${item.id}`}>
                  <div className="feed-card__meta"><span>{areaLabels[item.area]}</span><time>{formatDate(item.updatedAt)}</time></div>
                  <h2>{item.title}</h2>
                  {item.excerpt ? <p>{item.excerpt}</p> : null}
                  <div className="tag-row">{item.tags.map((tag) => <span key={tag.id}>#{tag.name}</span>)}</div>
                  <footer><small>{item.authorUsername ? `Shared by ${item.authorUsername}` : 'Curated by IAC'}</small><button type="button" onClick={() => openFeedItem(item)}>Open →</button></footer>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {tab === 'materials' ? (
        <MaterialsPanel
          materials={materials}
          selectedTags={tagSelection}
          signedIn={Boolean(session)}
          loading={loading}
          onRequireLogin={onRequireLogin}
          onSubmitted={(material) => {
            setMaterials((current) => [material, ...current])
            setNotice('Your learning material is in the admin approval queue.')
          }}
        />
      ) : null}

      {tab === 'faq' ? (
        <section className="simple-panel section-shell">
          <header><p className="eyebrow">Curated from the forum</p><h2>Frequently asked questions</h2><p>One question, one clear answer — maintained by the IAC team.</p></header>
          {loading ? <p className="empty-state">Loading answers…</p> : null}
          <div className="faq-list">{faq.map((entry) => <details key={entry.id}><summary>{entry.question}</summary><p>{entry.answer}</p></details>)}</div>
          {!loading && faq.length === 0 ? <p className="empty-state">The FAQ is being curated. Useful forum questions will appear here.</p> : null}
        </section>
      ) : null}

      {tab === 'admin' && isAdmin ? (
        <AdminPanel
          loading={loading}
          queue={queue}
          proposals={proposals}
          tagTypes={tagTypes}
          onModerate={async (item, decision) => { await moderate(item, decision); await loadAdmin() }}
          onTagDecision={async (tag, decision) => {
            const type = tagTypes.find((candidate) => candidate.field === tag.field)
            await decideTag(tag, decision, type?.id)
            await loadAdmin()
          }}
          onCreateFaq={async (question, answer) => {
            await createFaq({ question, answer, published: true })
            setNotice('FAQ entry published.')
          }}
          onCreateType={async (payload) => {
            await createTagType(payload)
            setNotice('Tag type created. Its validation rules are active.')
            await loadAdmin()
          }}
        />
      ) : null}
    </main>
  )
}

function MaterialsPanel({
  materials,
  selectedTags,
  signedIn,
  loading,
  onRequireLogin,
  onSubmitted,
}: {
  materials: LearningMaterial[]
  selectedTags: Record<string, unknown>
  signedIn: boolean
  loading: boolean
  onRequireLogin: () => void
  onSubmitted: (material: LearningMaterial) => void
}) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({ title: '', description: '', gradeNote: '', solutionApproach: '', methodUsed: '', roadmapFollowed: '' })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!file) { setError('Choose a PDF, audio, or video file.'); return }
    setSubmitting(true)
    setError(null)
    const type = file.type === 'application/pdf' ? 'PDF' : file.type.startsWith('audio/') ? 'AUDIO' : 'VIDEO'
    try {
      const material = await submitLearningMaterial({ ...form, type, tags: selectedTags }, file)
      onSubmitted(material)
      setOpen(false)
      setFile(null)
      setForm({ title: '', description: '', gradeNote: '', solutionApproach: '', methodUsed: '', roadmapFollowed: '' })
    } catch (reason) {
      setError(getApiErrorMessage(reason, 'Unable to submit the material.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="simple-panel section-shell">
      <header className="materials-heading"><div><p className="eyebrow">Learning materials</p><h2>Study resources with context.</h2><p>Browse by tags, or share a PDF, audio explanation, or video walkthrough.</p></div><button className="button button--gold" type="button" onClick={() => signedIn ? setOpen(!open) : onRequireLogin()}>Upload material</button></header>
      {open ? (
        <form className="material-form" onSubmit={submit}>
          <label>Title<input required maxLength={200} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label className="material-form__wide">Description<textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label>Your grade in the subject<input value={form.gradeNote} onChange={(event) => setForm({ ...form, gradeNote: event.target.value })} placeholder="Optional — e.g. 1.7" /></label>
          <label>How you got to the solution<input value={form.solutionApproach} onChange={(event) => setForm({ ...form, solutionApproach: event.target.value })} /></label>
          <label>Method used<input value={form.methodUsed} onChange={(event) => setForm({ ...form, methodUsed: event.target.value })} /></label>
          <label>Roadmap followed<input value={form.roadmapFollowed} onChange={(event) => setForm({ ...form, roadmapFollowed: event.target.value })} /></label>
          <label className="material-form__wide file-field">File<input required type="file" accept="application/pdf,audio/*,video/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
          {error ? <p className="form-error material-form__wide">{error}</p> : null}
          <button className="button button--gold material-form__wide" disabled={submitting} type="submit">{submitting ? 'Submitting…' : 'Send for approval'}</button>
        </form>
      ) : null}
      {loading ? <p className="empty-state">Loading materials…</p> : null}
      <div className="material-grid">{materials.map((material) => (
        <article key={material.id}>
          <span className="material-type">{material.type}</span><h3>{material.title}</h3><p>{material.description || 'Shared learning material'}</p>
          <div className="tag-row">{material.tags.map((tag) => <span key={tag.id}>#{tag.name}</span>)}</div>
          {material.moderationStatus === 'PENDING' ? <small>Awaiting admin approval</small> : <a href={resolveApiUrl(material.contentUrl)} target="_blank" rel="noreferrer">Open material →</a>}
        </article>
      ))}</div>
    </section>
  )
}

function AdminPanel({ loading, queue, proposals, tagTypes, onModerate, onTagDecision, onCreateFaq, onCreateType }: {
  loading: boolean
  queue: ModerationQueueItem[]
  proposals: ZitounaTag[]
  tagTypes: TagTypeDefinition[]
  onModerate: (item: ModerationQueueItem, decision: 'approve' | 'reject' | 'needs-fixing') => Promise<void>
  onTagDecision: (tag: ZitounaTag, decision: 'approve' | 'reject') => Promise<void>
  onCreateFaq: (question: string, answer: string) => Promise<void>
  onCreateType: (payload: TagTypePayload) => Promise<void>
}) {
  const [faqForm, setFaqForm] = useState({ question: '', answer: '' })
  const [typeForm, setTypeForm] = useState<TagTypePayload>({ name: '', field: 'TOPIC', minimumInstitutions: 0, minimumPrograms: 0, active: true })
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  return (
    <section className="simple-panel section-shell admin-panel">
      <header><p className="eyebrow">Administration</p><h2>Approval queue</h2><p>Nothing is published until an admin has reviewed it. Comments remain immediate and can be removed separately.</p></header>
      {loading ? <p className="empty-state">Loading queue…</p> : null}
      <div className="admin-grid">
        <div><h3>Content awaiting review <span>{queue.length}</span></h3>{queue.map((item) => (
          <article className="review-card" key={`${item.area}-${item.id}`}><small>{areaLabels[item.area]} · {item.authorUsername || 'Unknown author'}</small><h4>{item.title}</h4><pre>{JSON.stringify(item.details, null, 2)}</pre><div><button onClick={() => void onModerate(item, 'approve')}>Accept</button><button onClick={() => void onModerate(item, 'needs-fixing')}>Needs fixing</button><button className="danger" onClick={() => void onModerate(item, 'reject')}>Reject</button></div></article>
        ))}{!loading && queue.length === 0 ? <p className="empty-state">The content queue is clear.</p> : null}</div>
        <div><h3>Proposed tags <span>{proposals.length}</span></h3>{proposals.map((tag) => (
          <article className="review-card" key={tag.id}><small>{fieldLabels[tag.field]}</small><h4>{tag.name}</h4><p>Will inherit: {tagTypes.find((type) => type.field === tag.field)?.name ?? 'matching type'}</p><div><button onClick={() => void onTagDecision(tag, 'approve')}>Accept</button><button className="danger" onClick={() => void onTagDecision(tag, 'reject')}>Reject</button></div></article>
        ))}{!loading && proposals.length === 0 ? <p className="empty-state">No tag proposals are waiting.</p> : null}</div>
      </div>
      <div className="admin-tools">
        <form onSubmit={async (event) => {
          event.preventDefault(); setSaving(true); setFormError(null)
          try { await onCreateFaq(faqForm.question.trim(), faqForm.answer.trim()); setFaqForm({ question: '', answer: '' }) }
          catch (reason) { setFormError(getApiErrorMessage(reason, 'Unable to publish the FAQ entry.')) }
          finally { setSaving(false) }
        }}>
          <h3>Create an FAQ entry</h3>
          <label>Question<input required maxLength={300} value={faqForm.question} onChange={(event) => setFaqForm({ ...faqForm, question: event.target.value })} /></label>
          <label>Answer<textarea required rows={5} maxLength={10000} value={faqForm.answer} onChange={(event) => setFaqForm({ ...faqForm, answer: event.target.value })} /></label>
          <button disabled={saving} type="submit">Publish FAQ</button>
        </form>
        <form onSubmit={async (event) => {
          event.preventDefault(); setSaving(true); setFormError(null)
          try { await onCreateType(typeForm); setTypeForm({ name: '', field: 'TOPIC', minimumInstitutions: 0, minimumPrograms: 0, active: true }) }
          catch (reason) { setFormError(getApiErrorMessage(reason, 'Unable to create the tag type.')) }
          finally { setSaving(false) }
        }}>
          <h3>Create a tag type</h3>
          <label>Name<input required maxLength={80} value={typeForm.name} onChange={(event) => setTypeForm({ ...typeForm, name: event.target.value })} /></label>
          <label>Field<select value={typeForm.field} onChange={(event) => setTypeForm({ ...typeForm, field: event.target.value as TagField })}>{(Object.keys(fieldLabels) as TagField[]).map((field) => <option key={field} value={field}>{fieldLabels[field]}</option>)}</select></label>
          <label>Required institutions<input min={0} max={10} type="number" value={typeForm.minimumInstitutions} onChange={(event) => setTypeForm({ ...typeForm, minimumInstitutions: Number(event.target.value) })} /></label>
          <label>Required programs<input min={0} max={10} type="number" value={typeForm.minimumPrograms} onChange={(event) => setTypeForm({ ...typeForm, minimumPrograms: Number(event.target.value) })} /></label>
          <button disabled={saving} type="submit">Create tag type</button>
        </form>
      </div>
      {formError ? <p className="form-error">{formError}</p> : null}
    </section>
  )
}

function formatDate(value: string | null) {
  if (!value) return 'Recently'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed)
}
