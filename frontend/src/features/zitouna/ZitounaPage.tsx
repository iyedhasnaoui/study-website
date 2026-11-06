import {useEffect, useMemo, useState, type FormEvent} from 'react'
import {TagAutocomplete, type TagItem, type TagProposalItem} from '../../components/TagAutocomplete'
import {TagFilterFields} from '../../components/TagFilterFields'
import {Pagination} from '../../components/Pagination'
import {useFaqMutations} from './hooks/useFaqMutations'
import {useAuth} from '../../auth/AuthContext'
import {getApiErrorMessage, resolveApiUrl} from '../../lib/apiClient'
import {PostFeed} from '../forum/components/PostFeed'
import { RoadmapPage } from '../roadmap/RoadmapPage'

import {
    // createFaq,
    createTagType,
    createTag,
    decideTag,
    deleteLearningMaterial,
    getFaq,
    getLearningMaterials,
    getModerationQueue,
    getTagProposals,
    getTags,
    getTagTypes,
    getZitounaFeed,
    moderate,
    notifyTagsUpdated,
    submitLearningMaterial,
    TAGS_UPDATED_EVENT,
} from './api'
import type {
    FaqEntry,
    FeedArea,
    FeedItem,
    LearningMaterial,
    ModerationQueueItem,
    TagField,
    TagCreatePayload,
    TagTypeDefinition,
    TagTypePayload,
    ZitounaTag,
} from './types'
import './zitouna.css'

type ZitounaTab = 'discover' | 'materials' | 'faq' | 'admin' | 'roadmaps' | 'forum'

const validTabs: ZitounaTab[] = ['discover', 'materials', 'faq', 'admin', 'roadmaps', 'forum']

function getZitounaTabFromHash(hash: string): ZitounaTab | undefined {
    if (!hash.startsWith('#zitouna/')) return undefined
    const sub = hash.slice('#zitouna/'.length)
    return validTabs.includes(sub as ZitounaTab) ? (sub as ZitounaTab) : undefined
}

interface ZitounaPageProps {
    onCreatePost: () => void
    onRequireLogin: () => void
    onOpenPost?: (postId: number) => void
}

const areaLabels: Record<FeedArea, string> = {
    FORUM: 'Forum',
    ROADMAP: 'Roadmaps',
    LEARNING_MATERIAL: 'Learning materials',
    FAQ: 'FAQ',
}

const fieldLabels: Record<string, string> = {
    INSTITUTION: 'Institution',
    PROGRAM: 'Program / position',
    TOPIC: 'Topic',
    SUBTOPIC: 'Subtopic',
}

const allAreas = Object.keys(areaLabels) as FeedArea[]

const dateFormatter = new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'short'})

export function ZitounaPage({onCreatePost, onRequireLogin, onOpenPost}: ZitounaPageProps) {
    const {session} = useAuth()
    const isAdmin = Boolean(session?.user.roles?.includes('ADMIN'))
    const [tab, setTab] = useState<ZitounaTab>(() => getZitounaTabFromHash(window.location.hash) ?? 'discover')
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

    // Pagination state per tab
    const PAGE_SIZE = 10
    const [feedPage, setFeedPage] = useState(0)
    const [feedTotalPages, setFeedTotalPages] = useState(0)
    const [materialsPage, setMaterialsPage] = useState(0)
    const [materialsTotalPages, setMaterialsTotalPages] = useState(0)
    const [faqPage, setFaqPage] = useState(0)
    const [faqTotalPages, setFaqTotalPages] = useState(0)
    const [forumPage, setForumPage] = useState(0)
    const [forumTotalPages, setForumTotalPages] = useState(0)
    const [roadmapsPage, setRoadmapsPage] = useState(0)
    const [roadmapsTotalPages, setRoadmapsTotalPages] = useState(0)


    useEffect(() => {
        const loadTags = () => {
            getTags().then(setTags).catch((reason) => setError(getApiErrorMessage(reason, 'Unable to load tags.')))
        }

        loadTags()
        window.addEventListener(TAGS_UPDATED_EVENT, loadTags)
        return () => window.removeEventListener(TAGS_UPDATED_EVENT, loadTags)
    }, [])

    useEffect(() => {
        const onHashChange = () => {
            const tabFromHash = getZitounaTabFromHash(window.location.hash)
            if (tabFromHash) setTab(tabFromHash)
        }
        window.addEventListener('hashchange', onHashChange)
        return () => window.removeEventListener('hashchange', onHashChange)
    }, [])

    useEffect(() => {
        setFeedPage(0)
        setFeedTotalPages(0)
    }, [query, selectedTags, areas])

    useEffect(() => {
        if (tab !== 'discover') return
        let active = true
        setLoading(true)
        setError(null)
        getZitounaFeed({query, areas, tagIds: selectedTags, page: feedPage, size: PAGE_SIZE})
            .then((result) => {
                if (!active) return
                if ('content' in result) {
                    setFeed(result.content)
                    setFeedTotalPages(result.totalPages)
                } else {
                    setFeed(result)
                    setFeedTotalPages(0)
                }
            })
            .catch((reason) => active && setError(getApiErrorMessage(reason, 'Unable to load Zitouna.')))
            .finally(() => active && setLoading(false))
        return () => {
            active = false
        }
    }, [areas, query, selectedTags, tab, feedPage])

    useEffect(() => {
        setMaterialsPage(0)
        setMaterialsTotalPages(0)
    }, [query, selectedTags])

    useEffect(() => {
        if (tab !== 'materials') return
        let active = true
        setLoading(true)
        setError(null)
        getLearningMaterials({
            includeMine: Boolean(session),
            query,
            tagIds: selectedTags,
            page: materialsPage,
            size: PAGE_SIZE,
        })
            .then((result) => {
                if (!active) return
                if ('content' in result) {
                    setMaterials(result.content)
                    setMaterialsTotalPages(result.totalPages)
                } else {
                    setMaterials(result)
                    setMaterialsTotalPages(0)
                }
            })
            .catch((reason) => active && setError(getApiErrorMessage(reason, 'Unable to load learning materials.')))
            .finally(() => active && setLoading(false))
        return () => {
            active = false
        }
    }, [session, tab, query, selectedTags, materialsPage])

    useEffect(() => {
        setFaqPage(0)
        setFaqTotalPages(0)
    }, [query, selectedTags])

    useEffect(() => {
        if (tab !== 'faq') return
        let active = true
        setLoading(true)
        setError(null)
        getFaq({query, tagIds: selectedTags, page: faqPage, size: PAGE_SIZE})
            .then((result) => {
                if (!active) return
                if ('content' in result) {
                    setFaq(result.content)
                    setFaqTotalPages(result.totalPages)
                } else {
                    setFaq(result)
                    setFaqTotalPages(0)
                }
            })
            .catch((reason) => active && setError(getApiErrorMessage(reason, 'Unable to load the FAQ.')))
            .finally(() => active && setLoading(false))
        return () => {
            active = false
        }
    }, [tab, query, selectedTags, faqPage])

    useEffect(() => {
        setForumPage(0)
        setForumTotalPages(0)
    }, [query, selectedTags])

    useEffect(() => {
        setRoadmapsPage(0)
        setRoadmapsTotalPages(0)
    }, [query, selectedTags])

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
        window.sessionStorage.setItem('iac.zitouna.post-prefill', JSON.stringify({tags: selected, tagSelection}))
        onCreatePost()
    }

    const openFeedItem = (item: FeedItem) => {
        if (item.area === 'FORUM') {
            if (onOpenPost) onOpenPost(item.id)
            else setTab('forum')
        }
        else if (item.area === 'ROADMAP') window.location.hash = `#roadmaps/${item.id}`
        else if (item.area === 'LEARNING_MATERIAL' && item.contentUrl) window.open(resolveApiUrl(item.contentUrl), '_blank', 'noopener,noreferrer')
        else setTab('faq')
    }

    return (
        <main className="zitouna-page">
            <section className="zitouna-hero section-shell">
                <div>
                    <p className="eyebrow">IAC set of tools</p>
                    <h1>Zitouna</h1>
                    <p>One searchable circle for roadmaps, discussions, learning materials, and answers — organised by
                        tags, never buried in folders.</p>
                </div>
                <div className="zitouna-hero__mark"><img src="/assets/iac-logo.jpeg" alt="IAC palm tree"/></div>
            </section>

            {tab !== 'admin' ? (
                <section className="zitouna-global-filters section-shell" aria-label="Search and filter Zitouna content">
                    <div className="zitouna-global-filters__heading">
                        <div>
                            <p className="eyebrow">Explore Zitouna</p>
                            <h2>Find the right resource</h2>
                        </div>
                        {query || queryDraft || selectedTags.length > 0 ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setQueryDraft('')
                                    setQuery('')
                                    setSelectedTags([])
                                }}
                            >
                                Clear filters
                            </button>
                        ) : null}
                    </div>
                    <form className="zitouna-search" role="search" onSubmit={(event) => {
                        event.preventDefault()
                        setQuery(queryDraft.trim())
                    }}>
                        <span aria-hidden="true">⌕</span>
                        <input
                            value={queryDraft}
                            onChange={(event) => setQueryDraft(event.target.value)}
                            placeholder="Search titles and descriptions..."
                            aria-label="Search titles and descriptions"
                        />
                        <button type="submit">Search</button>
                    </form>
                    <TagFilterFields tags={tags} selectedTagIds={selectedTags} onChange={setSelectedTags}/>
                </section>
            ) : null}

            <nav className="zitouna-tabs section-shell" aria-label="Zitouna sections">
                {(['discover', 'materials', 'roadmaps', 'forum', 'faq'] as ZitounaTab[]).map((name) => (
                    <button key={name} className={tab === name ? 'is-active' : ''} type="button"
                            onClick={() => setTab(name)}>
                        {name === 'discover' ? 'Discover' : name === 'materials' ? 'Learning materials' : name === 'roadmaps' ? 'Roadmaps' : name === 'forum' ? 'Forum' : 'FAQ'}
                    </button>
                ))}
                {isAdmin ? <button className={tab === 'admin' ? 'is-active' : ''} type="button"
                                   onClick={() => setTab('admin')}>Admin queue</button> : null}
            </nav>

            {notice ? (
                <div className="zitouna-notice section-shell flex items-center justify-between" role="status">
                    <span>{notice}</span>
                    <button type="button" className="ml-4 font-bold opacity-70 hover:opacity-100" onClick={() => setNotice(null)}>
                        ✕
                    </button>
                </div>
            ) : null}
            {error ? <div className="zitouna-error section-shell" role="alert">{error}</div> : null}

            {tab === 'discover' ? (
                <section className="zitouna-workspace zitouna-workspace--single section-shell">
                    <div className="discovery-panel">
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
                        </div>

                        <div className="feed-list" aria-live="polite">
                            {loading ? <p className="empty-state">Gathering the latest contributions…</p> : null}
                            {!loading && feed.length === 0 ?
                                <p className="empty-state">Nothing matches these sets yet. Try removing a filter or be
                                    the first to contribute.</p> : null}
                            {feed.map((item) => (
                                <article className={`feed-card feed-card--${item.area.toLowerCase()}`}
                                         key={`${item.area}-${item.id}`}>
                                    <div className="feed-card__meta"><span>{areaLabels[item.area]}</span>
                                        <time>{formatDate(item.updatedAt)}</time>
                                    </div>
                                    <h2>{item.title}</h2>
                                    {item.excerpt ? <p>{item.excerpt}</p> : null}
                                    <div className="tag-row">{item.tags.map((tag) => <span
                                        key={tag.id}>#{tag.name}</span>)}</div>
                                    <footer>
                                        <small>{item.authorUsername ? `${item.authorUsername}` : 'Curated by IAC'}</small>
                                        <button type="button" onClick={() => openFeedItem(item)}>Open →</button>
                                    </footer>
                                </article>
                            ))}
                        </div>
                        <Pagination currentPage={feedPage} totalPages={feedTotalPages} onPageChange={(p) => setFeedPage(p)} />
                    </div>
                </section>
            ) : null}

            {tab === 'materials' ? (
                <MaterialsPanel
                    materials={materials}
                    selectedTags={tagSelection}
                    signedIn={Boolean(session)}
                    isAdmin={isAdmin}
                    loading={loading}
                    onRequireLogin={onRequireLogin}
                    onSubmitted={(material) => {
                        setMaterials((current) => [material, ...current])
                        setNotice('Your learning material is in the admin approval queue.')
                    }}
                    onDelete={(id) => {
                        setMaterials((current) => current.filter((m) => m.id !== id))
                        setNotice('Learning material deleted.')
                    }}
                />
            ) : null}
            {tab === 'materials' ? (
                <Pagination currentPage={materialsPage} totalPages={materialsTotalPages} onPageChange={(p) => setMaterialsPage(p)} />
            ) : null}

            {tab === 'faq' ? (
                <section className="simple-panel section-shell">
                    <header><p className="eyebrow">Curated from the forum</p><h2>Frequently asked questions</h2><p>One
                        question, one clear answer — maintained by the IAC team.</p></header>
                    {loading ? <p className="empty-state">Loading answers…</p> : null}
                    <div className="faq-list">{faq.map((entry) => <details key={entry.id}>
                        <summary>{entry.question}</summary>
                        <p>{entry.answer}</p></details>)}</div>
                    {!loading && faq.length === 0 ?
                        <p className="empty-state">The FAQ is being curated. Useful forum questions will appear
                            here.</p> : null}
                    <Pagination currentPage={faqPage} totalPages={faqTotalPages} onPageChange={(p) => setFaqPage(p)} />
                </section>
            ) : null}

            {tab === 'roadmaps' ? (
                <section className="section-shell">
                    <RoadmapPage
                        onBackToFeed={() => setTab('roadmaps')}
                        sharedFilters={{query: query || undefined, tagIds: selectedTags}}
                        page={roadmapsPage}
                        size={PAGE_SIZE}
                        onTotalPages={setRoadmapsTotalPages}
                    />
                </section>
            ) : null}
            {tab === 'roadmaps' ? (
                <Pagination currentPage={roadmapsPage} totalPages={roadmapsTotalPages} onPageChange={(p) => setRoadmapsPage(p)} />
            ) : null}

            {tab === 'forum' ? (
                <section className="zitouna-workspace zitouna-workspace--single section-shell">
                    <div className="discovery-panel">
                        <header className="materials-heading">
                            <div>
                                <p className="eyebrow">Community discussions</p>
                                <h2>Forum</h2>
                                <p>Browse the most recent discussions and join any thread.</p>
                            </div>
                            <button className="button button--gold" type="button" onClick={startPost}>+ New post</button>
                        </header>

                        <PostFeed
                            query={query || undefined}
                            tagIds={selectedTags.length > 0 ? selectedTags : undefined}
                            page={forumPage}
                            size={PAGE_SIZE}
                            onTotalPages={setForumTotalPages}
                            onOpenPost={onOpenPost}
                        />
                        <Pagination currentPage={forumPage} totalPages={forumTotalPages} onPageChange={(p) => setForumPage(p)} />
                    </div>
                </section>
            ) : null}

            {tab === 'admin' && isAdmin ? (
                <AdminPanel
                    loading={loading}
                    queue={queue}
                    proposals={proposals}
                    tagTypes={tagTypes}
                    faqs={faq}
                    availableTags={tags}
                    onModerate={async (item, decision) => {
                        await moderate(item, decision);
                        await loadAdmin()
                    }}
                    onTagDecision={async (tag, decision) => {
                        const type = tagTypes.find((candidate) => candidate.field === tag.field)
                        await decideTag(tag, decision, type?.id)
                        if (decision === 'approve') notifyTagsUpdated()
                        await loadAdmin()
                    }}
                    // onCreateFaq={async (question, answer) => {
                    //   await createFaq({ question, answer, published: true })
                    //   setNotice('FAQ entry published.')
                    // }}
                    onCreateType={async (payload) => {
                        await createTagType(payload)
                        setNotice('Tag type created. Its validation rules are active.')
                        await loadAdmin()
                    }}
                    onCreateTag={async (payload) => {
                        await createTag(payload)
                        notifyTagsUpdated()
                        setTags(await getTags())
                        setNotice('Approved tag created.')
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
                            isAdmin,
                            loading,
                            onRequireLogin,
                            onSubmitted,
                            onDelete,
                        }: {
    materials: LearningMaterial[]
    selectedTags: Record<string, unknown>
    signedIn: boolean
    isAdmin: boolean
    loading: boolean
    onRequireLogin: () => void
    onSubmitted: (material: LearningMaterial) => void
    onDelete: (id: number) => void
}) {
    const [open, setOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [file, setFile] = useState<File | null>(null)
    const [formTags, setFormTags] = useState<TagItem[]>([])
    const [tagProposals, setTagProposals] = useState<TagProposalItem[]>([])
    const [form, setForm] = useState({
        title: '',
        description: '',
        gradeNote: '',
        solutionApproach: '',
        methodUsed: '',
        roadmapFollowed: '',
    })

    const submit = async (event: FormEvent) => {
        event.preventDefault()
        if (!file) {
            setError('Choose a PDF, audio, or video file.')
            return
        }
        setSubmitting(true)
        setError(null)
        const type = file.type === 'application/pdf' ? 'PDF' : file.type.startsWith('audio/') ? 'AUDIO' : 'VIDEO'

        // Distribute autocomplete tags into the correct TagSelectionDto fields by their field type
        const ids = (field: string) => formTags.filter((t) => t.field === field).map((t) => t.id)
        const institutions = ids('INSTITUTION')

        const builtTagSelection: Record<string, unknown> = {}
        if (institutions.length > 0) {
            builtTagSelection.homeInstitutionId = institutions[0]
            builtTagSelection.partnerInstitutionId = institutions[1] ?? null
            builtTagSelection.institutionIds = institutions
        }
        if (ids('PROGRAM').length > 0) builtTagSelection.programIds = ids('PROGRAM')
        if (ids('TOPIC').length > 0) builtTagSelection.topicIds = ids('TOPIC')
        if (ids('SUBTOPIC').length > 0) builtTagSelection.subtopicIds = ids('SUBTOPIC')
        builtTagSelection.proposals = tagProposals

        // Merge with pre-filtered tagSelection from the Zitouna filter panel (user autocomplete takes precedence)
        const tagPayload = {
            ...(selectedTags as Record<string, unknown>),
            ...builtTagSelection,
        }

        try {
            const material = await submitLearningMaterial({ ...form, type, tags: tagPayload }, file)
            onSubmitted(material)
            setOpen(false)
            setFile(null)
            setFormTags([])
            setTagProposals([])
            setForm({
                title: '',
                description: '',
                gradeNote: '',
                solutionApproach: '',
                methodUsed: '',
                roadmapFollowed: '',
            })
        } catch (reason) {
            setError(getApiErrorMessage(reason, 'Unable to submit the material.'))
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (materialId: number) => {
        if (!window.confirm('Are you sure you want to delete this learning material?')) return
        try {
            await deleteLearningMaterial(materialId)
            onDelete(materialId)
        } catch (reason) {
            setError(getApiErrorMessage(reason, 'Unable to delete the material.'))
        }
    }

    return (
        <section className="zitouna-workspace zitouna-workspace--single section-shell">
            <div className="discovery-panel">
                <header className="materials-heading">
                    <div>
                        <p className="eyebrow">Learning materials</p>
                        <h2>Study resources with context.</h2>
                        <p>Browse by tags, or share a PDF, audio explanation, or video walkthrough.</p>
                    </div>
                    <button className="button button--gold" type="button" onClick={() => (signedIn ? setOpen(!open) : onRequireLogin())}>
                        Upload material
                    </button>
                </header>

                {open ? (
                    <form className="material-form" onSubmit={submit}>
                        <label>Title<input required maxLength={200} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
                        <label className="material-form__wide">Description<textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
                        <label>Your grade in the subject<input value={form.gradeNote} onChange={(event) => setForm({ ...form, gradeNote: event.target.value })} placeholder="Optional — e.g. 1.7" /></label>
                        <label>How you got to the solution<input value={form.solutionApproach} onChange={(event) => setForm({ ...form, solutionApproach: event.target.value })} /></label>
                        <label>Method used<input value={form.methodUsed} onChange={(event) => setForm({ ...form, methodUsed: event.target.value })} /></label>
                        <label>Roadmap followed<input value={form.roadmapFollowed} onChange={(event) => setForm({ ...form, roadmapFollowed: event.target.value })} /></label>

                        <div className="material-form__wide">
                            <TagAutocomplete
                                selectedTags={formTags}
                                onChange={setFormTags}
                                proposals={tagProposals}
                                onProposalsChange={setTagProposals}
                                allowProposals
                                placeholder="Add relevant tags..."
                            />
                        </div>

                        <label className="material-form__wide file-field">File<input required type="file" accept="application/pdf,audio/*,video/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
                        {error ? <p className="form-error material-form__wide">{error}</p> : null}
                        <button className="button button--gold material-form__wide" disabled={submitting} type="submit">{submitting ? 'Submitting…' : 'Send for approval'}</button>
                    </form>
                ) : null}

                {loading ? <p className="empty-state">Loading materials…</p> : null}
                <div className="material-grid">
                    {materials.map((material) => (
                        <article key={material.id}>
                            <span className="material-type">{material.type}</span>
                            <h3>{material.title}</h3>
                            <p>{material.description || 'Shared learning material'}</p>
                            <div className="tag-row">{material.tags.map((tag) => <span key={tag.id}>#{tag.name}</span>)}</div>
                            {material.authorUsername ? (
                                <small className="text-slate-500 dark:text-zinc-400">{material.authorUsername}</small>
                            ) : null}
                            {material.moderationStatus === 'PENDING' ? (
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                    Awaiting admin approval
                                </span>
                            ) : material.moderationStatus === 'NEEDS_FIXING' ? (
                                <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                                    Needs fixing{material.moderationNote ? ` — ${material.moderationNote}` : ''}
                                </span>
                            ) : material.moderationStatus === 'REJECTED' ? (
                                <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                                    Rejected{material.moderationNote ? ` — ${material.moderationNote}` : ''}
                                </span>
                            ) : (
                                <a href={resolveApiUrl(material.contentUrl)} target="_blank" rel="noreferrer">Open material →</a>
                            )}
                            {isAdmin ? (
                                <button
                                    type="button"
                                    className="mt-2 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                                    onClick={() => handleDelete(material.id)}
                                >
                                    Delete
                                </button>
                            ) : null}
                        </article>
                    ))}
                </div>
                {!loading && materials.length === 0 ?
                    <p className="empty-state">No materials match these filters. Try removing a filter or be the first to contribute.</p> : null}
            </div>
        </section>
    )
}

function AdminPanel({
                        loading,
                        queue,
                        proposals,
                        tagTypes,
                        faqs,
                        availableTags,
                        onModerate,
                        onTagDecision,
                        onCreateType,
                        onCreateTag,
                    }: {
    loading: boolean
    queue: ModerationQueueItem[]
    proposals: ZitounaTag[]
    tagTypes: TagTypeDefinition[]
    faqs: FaqEntry[]
    availableTags: ZitounaTag[]
    onModerate: (item: ModerationQueueItem, decision: 'approve' | 'reject' | 'needs-fixing') => Promise<void>
    onTagDecision: (tag: ZitounaTag, decision: 'approve' | 'reject') => Promise<void>
    onCreateType: (payload: TagTypePayload) => Promise<void>
    onCreateTag: (payload: TagCreatePayload) => Promise<void>
}) {
    const [typeForm, setTypeForm] = useState<TagTypePayload>({
        name: '',
        field: 'TOPIC',
        minimumInstitutions: 0,
        minimumPrograms: 0,
        active: true
    })
    const [formError, setFormError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const {createMutation, updateMutation, deleteMutation} = useFaqMutations();
    const [editingId, setEditingId] = useState<number | null>(null);
    const [tagForm, setTagForm] = useState<TagCreatePayload>({name: '', typeId: tagTypes[0]?.id ?? 0})

    useEffect(() => {
        if (!tagForm.typeId && tagTypes.length > 0) setTagForm((current) => ({...current, typeId: tagTypes[0].id}))
    }, [tagForm.typeId, tagTypes])

    return (
        <section className="simple-panel section-shell admin-panel">
            <header><p className="eyebrow">Administration</p><h2>Approval queue</h2><p>Nothing is published until an
                admin has reviewed it. Comments remain immediate and can be removed separately.</p></header>
            {loading ? <p className="empty-state">Loading queue…</p> : null}
            <div className="admin-grid">
                <div><h3>Content awaiting review <span>{queue.length}</span></h3>{queue.map((item) => (
                    <article className="review-card" key={`${item.area}-${item.id}`}>
                        <small>{areaLabels[item.area]} · {item.authorUsername || 'Unknown author'}</small>
                        <h4>{item.title}</h4>
                        <pre>{JSON.stringify(item.details, null, 2)}</pre>
                        <div>
                            <button onClick={() => void onModerate(item, 'approve')}>Accept</button>
                            <button onClick={() => void onModerate(item, 'needs-fixing')}>Needs fixing</button>
                            <button className="danger" onClick={() => void onModerate(item, 'reject')}>Reject</button>
                        </div>
                    </article>
                ))}{!loading && queue.length === 0 ? <p className="empty-state">The content queue is clear.</p> : null}
                </div>
                <div><h3>Proposed tags <span>{proposals.length}</span></h3>{proposals.map((tag) => (
                    <article className="review-card" key={tag.id}><small>{fieldLabels[tag.field]}</small>
                        <h4>{tag.name}</h4><p>Will
                            inherit: {tagTypes.find((type) => type.field === tag.field)?.name ?? 'matching type'}</p>
                        <div>
                            <button onClick={() => void onTagDecision(tag, 'approve')}>Accept</button>
                            <button className="danger" onClick={() => void onTagDecision(tag, 'reject')}>Reject</button>
                        </div>
                    </article>
                ))}{!loading && proposals.length === 0 ?
                    <p className="empty-state">No tag proposals are waiting.</p> : null}</div>
            </div>
            <div className="admin-tools">
                <form className="review-card" onSubmit={async (event) => {
                    event.preventDefault()
                    setSaving(true)
                    setFormError(null)
                    try {
                        await onCreateTag(tagForm)
                        setTagForm({name: '', typeId: tagForm.typeId, parentId: null})
                    } catch (reason) {
                        setFormError(getApiErrorMessage(reason, 'Unable to create the tag.'))
                    } finally {
                        setSaving(false)
                    }
                }}>
                    <h3>Create an approved tag</h3>
                    <label>Name<input required maxLength={120} value={tagForm.name} onChange={(event) => setTagForm({...tagForm, name: event.target.value})} /></label>
                    <label>Tag type<select required value={tagForm.typeId || ''} onChange={(event) => setTagForm({...tagForm, typeId: Number(event.target.value), parentId: null})}>
                        <option value="" disabled>Choose a tag type</option>
                        {tagTypes.map((type) => <option key={type.id} value={type.id}>{type.name} · {fieldLabels[type.field]}</option>)}
                    </select></label>
                    {tagTypes.find((type) => type.id === tagForm.typeId)?.field === 'SUBTOPIC' ? (
                        <label>Approved parent topic or subtopic<select required value={tagForm.parentId ?? ''} onChange={(event) => setTagForm({...tagForm, parentId: Number(event.target.value)})}>
                            <option value="">Choose a parent</option>
                            {availableTags.filter((tag) => tag.field === 'TOPIC'
                                || (tag.field === 'SUBTOPIC' && availableTags.some((parent) => parent.id === tag.parentId && parent.field === 'TOPIC')))
                                .map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
                        </select></label>
                    ) : null}
                    <button disabled={saving || !tagForm.typeId} type="submit">Create approved tag</button>
                </form>

                {/* NEW FAQ MANAGEMENT SECTION */}
                <div className="faq-manager"
                     style={{gridColumn: '1 / -1', marginTop: '2rem', borderTop: '1px solid #ccc', paddingTop: '2rem'}}>
                    <h3>Manage FAQs</h3>

                    {/* Create Form */}
                    <div className="review-card" style={{marginBottom: '2rem', border: '2px solid #D9A05B'}}>
                        <div className="review-card-header"><h4>Draft New FAQ</h4></div>
                        <div className="review-card-body">
                            <FaqForm availableTags={availableTags} onSubmit={(data) => {
                                createMutation.mutate(data, {onSuccess: () => window.location.reload()});
                            }}/>
                        </div>
                    </div>

                    {/* List Existing FAQs */}
                    <div className="faq-list">
                        {faqs.map(faq => (
                            <div key={faq.id} className="review-card">
                                <div className="review-card-header">
                                    <h4>{faq.question}</h4>
                                    <div style={{display: 'flex', gap: '0.5rem'}}>
                                        <button onClick={() => setEditingId(editingId === faq.id ? null : faq.id)}>
                                            {editingId === faq.id ? 'Cancel' : 'Edit'}
                                        </button>
                                        <button className="danger" onClick={() => {
                                            if (window.confirm('Delete this FAQ?')) deleteMutation.mutate(faq.id, {onSuccess: () => window.location.reload()});
                                        }}>Delete
                                        </button>
                                    </div>
                                </div>
                                <div className="review-card-body">
                                    <p>{faq.answer}</p>
                                    <div className="tag-row">
                                        {!faq.published && <span style={{color: '#D9A05B'}}>[Draft]</span>}
                                        {faq.tags?.map(tag => <span key={tag.id}>#{tag.name}</span>)}
                                    </div>
                                </div>
                                {/* Edit Form */}
                                {editingId === faq.id && (
                                    <FaqForm initialData={faq} availableTags={availableTags} onSubmit={(data) => {
                                        updateMutation.mutate({id: faq.id, data: data as any}, {
                                            onSuccess: () => {
                                                setEditingId(null);
                                                window.location.reload();
                                            }
                                        });
                                    }}/>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <form onSubmit={async (event) => {
                    event.preventDefault();
                    setSaving(true);
                    setFormError(null)
                    try {
                        await onCreateType(typeForm);
                        setTypeForm({
                            name: '',
                            field: 'TOPIC',
                            minimumInstitutions: 0,
                            minimumPrograms: 0,
                            active: true
                        })
                    } catch (reason) {
                        setFormError(getApiErrorMessage(reason, 'Unable to create the tag type.'))
                    } finally {
                        setSaving(false)
                    }
                }}>
                    <h3>Create a tag type</h3>
                    <label>Name<input required maxLength={80} value={typeForm.name} onChange={(event) => setTypeForm({
                        ...typeForm,
                        name: event.target.value
                    })}/></label>
                    <label>Field<select value={typeForm.field} onChange={(event) => setTypeForm({
                        ...typeForm,
                        field: event.target.value as TagField
                    })}>{(Object.keys(fieldLabels) as TagField[]).map((field) => <option key={field}
                                                                                         value={field}>{fieldLabels[field]}</option>)}</select></label>
                    <label>Required institutions<input min={0} max={10} type="number"
                                                       value={typeForm.minimumInstitutions}
                                                       onChange={(event) => setTypeForm({
                                                           ...typeForm,
                                                           minimumInstitutions: Number(event.target.value)
                                                       })}/></label>
                    <label>Required programs<input min={0} max={10} type="number" value={typeForm.minimumPrograms}
                                                   onChange={(event) => setTypeForm({
                                                       ...typeForm,
                                                       minimumPrograms: Number(event.target.value)
                                                   })}/></label>
                    <button disabled={saving} type="submit">Create tag type</button>
                </form>
            </div>
            {formError ? <p className="form-error">{formError}</p> : null}
        </section>
    )
}

// Subcomponent placed at the very bottom of the file
function FaqForm({initialData, availableTags: _availableTags, onSubmit}: {
    initialData?: FaqEntry;
    availableTags: ZitounaTag[];
    onSubmit: (data: { question: string; answer: string; published: boolean; tagIds: number[] }) => void;
}) {
    const [question, setQuestion] = useState(initialData?.question || '');
    const [answer, setAnswer] = useState(initialData?.answer || '');
    const [published, setPublished] = useState(initialData?.published ?? true);

    // Convert initial tag IDs into TagItem objects
    const [selectedTags, setSelectedTags] = useState<TagItem[]>(
        initialData?.tags?.map((t) => ({id: t.id, name: t.name})) || []
    );

    return (
        <form onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
                question,
                answer,
                published,
                tagIds: selectedTags.map((t) => t.id),
            });
        }}>
            <label>Question
                <input required value={question} onChange={e => setQuestion(e.target.value)}/>
            </label>

            <label>Answer
                <textarea required rows={4} value={answer} onChange={e => setAnswer(e.target.value)}/>
            </label>

            {/* Replaced checkbox list with TagAutocomplete */}
            <TagAutocomplete
                selectedTags={selectedTags}
                onChange={setSelectedTags}
            />

            <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem'}}>
                <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)}/> Publish
                immediately
            </label>

            <button type="submit" style={{marginTop: '1rem'}}>{initialData ? 'Save Changes' : 'Create FAQ'}</button>
        </form>
    );
}

function formatDate(value: string | null) {
    if (!value) return 'Recently'
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed)
}
