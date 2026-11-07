import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react'
import {beforeEach, expect, it, vi} from 'vitest'
import {ZitounaPage} from './ZitounaPage'

const apiMocks = vi.hoisted(() => ({
    createTagType: vi.fn(),
    createTag: vi.fn(),
    createFaq: vi.fn(),
    updateFaq: vi.fn(),
    deleteFaq: vi.fn(),
    decideTag: vi.fn(),
    deleteLearningMaterial: vi.fn(),
    getFaq: vi.fn(),
    getLearningMaterials: vi.fn(),
    getModerationQueue: vi.fn(),
    getTagProposals: vi.fn(),
    getTags: vi.fn(),
    getTagTypes: vi.fn(),
    getZitounaFeed: vi.fn(),
    moderate: vi.fn(),
    notifyTagsUpdated: vi.fn(),
    submitLearningMaterial: vi.fn(),
}))

vi.mock('./api', () => ({...apiMocks, TAGS_UPDATED_EVENT: 'zitouna-tags-updated'}))
vi.mock('../../auth/AuthContext', () => ({useAuth: () => ({session: null, isAdmin: false})}))
vi.mock('../forum/components/PostFeed', () => ({
    PostFeed: ({query, tagIds, page, onTotalPages}: {query?: string; tagIds?: number[]; page?: number; onTotalPages?: (totalPages: number) => void}) => (
        <>
            <div data-testid="forum-filters">{JSON.stringify({query, tagIds})}</div>
            <div data-testid="forum-page">{page}</div>
            <button type="button" onClick={() => onTotalPages?.(3)}>Load forum pages</button>
        </>
    ),
}))
vi.mock('../roadmap/RoadmapFeedPage', () => ({
    RoadmapFeedPage: ({sharedFilters, page, onTotalPages}: {sharedFilters?: {query?: string; tagIds: number[]}; page?: number; onTotalPages?: (totalPages: number) => void}) => (
        <>
            <div data-testid="roadmap-filters">{JSON.stringify(sharedFilters)}</div>
            <div data-testid="roadmap-page">{page}</div>
            <button type="button" onClick={() => onTotalPages?.(3)}>Load roadmap pages</button>
        </>
    ),
}))

const tags = [
    {id: 1, name: 'North University', field: 'INSTITUTION', type: 'University', parentId: null, parentName: null, status: 'APPROVED', aliases: [], decisionReason: null},
    {id: 2, name: 'Computer Science', field: 'PROGRAM', type: 'Program', parentId: null, parentName: null, status: 'APPROVED', aliases: [], decisionReason: null},
    {id: 3, name: 'Calculus', field: 'TOPIC', type: 'Topic', parentId: null, parentName: null, status: 'APPROVED', aliases: [], decisionReason: null},
    {id: 4, name: 'Limits', field: 'SUBTOPIC', type: 'Subtopic', parentId: 3, parentName: 'Calculus', status: 'APPROVED', aliases: [], decisionReason: null},
]

beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState(null, '', '/#zitouna')
    apiMocks.getTags.mockResolvedValue(tags)
    apiMocks.getZitounaFeed.mockResolvedValue([])
    apiMocks.getLearningMaterials.mockResolvedValue([])
    apiMocks.getFaq.mockResolvedValue([])
})

it('shares search and field-specific tag filters across Zitouna content tabs', async () => {
    const {container} = render(
        <ZitounaPage onCreatePost={vi.fn()} onRequireLogin={vi.fn()}/>,
    )

    expect(container.querySelector('.zitouna-global-filters')?.compareDocumentPosition(container.querySelector('.zitouna-tabs')!))
        .toBe(Node.DOCUMENT_POSITION_FOLLOWING)

    const topicSearch = screen.getByRole('combobox', {name: 'Topic search'})
    fireEvent.focus(topicSearch)
    fireEvent.click(await screen.findByRole('option', {name: '#Calculus'}))

    const search = screen.getByRole('textbox', {name: 'Search titles and descriptions'})
    fireEvent.change(search, {target: {value: 'limits'}})
    fireEvent.click(screen.getByRole('button', {name: 'Search'}))

    const navigation = within(screen.getByRole('navigation', {name: 'Zitouna sections'}))

    await waitFor(() => expect(apiMocks.getZitounaFeed).toHaveBeenLastCalledWith(
        expect.objectContaining({query: 'limits', tagIds: [3]}),
    ))

    fireEvent.click(navigation.getByRole('button', {name: 'Learning materials'}))
    await waitFor(() => expect(apiMocks.getLearningMaterials).toHaveBeenLastCalledWith(
        expect.objectContaining({query: 'limits', tagIds: [3]}),
    ))

    fireEvent.click(navigation.getByRole('button', {name: 'FAQ'}))
    await waitFor(() => expect(apiMocks.getFaq).toHaveBeenLastCalledWith(
        expect.objectContaining({query: 'limits', tagIds: [3]}),
    ))

    fireEvent.click(navigation.getByRole('button', {name: 'Forum'}))
    expect(screen.getByTestId('forum-filters')).toHaveTextContent('{"query":"limits","tagIds":[3]}')

    fireEvent.click(navigation.getByRole('button', {name: 'Roadmaps'}))
    expect(screen.getByTestId('roadmap-filters')).toHaveTextContent('{"query":"limits","tagIds":[3]}')

    fireEvent.click(screen.getByRole('button', {name: 'Clear filters'}))
    expect(screen.getByRole('textbox', {name: 'Search titles and descriptions'})).toHaveValue('')
    expect(screen.getByTestId('roadmap-filters')).toHaveTextContent('{"tagIds":[]}')
})

it('records Zitouna tab navigation in the URL and uses the roadmap feed directly', async () => {
    render(<ZitounaPage onCreatePost={vi.fn()} onRequireLogin={vi.fn()}/>)
    const navigation = within(screen.getByRole('navigation', {name: 'Zitouna sections'}))

    fireEvent.click(navigation.getByRole('button', {name: 'FAQ'}))
    expect(window.location.hash).toBe('#zitouna/faq')

    fireEvent.click(navigation.getByRole('button', {name: 'Roadmaps'}))
    expect(window.location.hash).toBe('#zitouna/roadmaps')
    expect(screen.getByTestId('roadmap-filters')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', {name: 'Load roadmap pages'}))
    fireEvent.click(within(screen.getByRole('navigation', {name: 'Pagination'})).getByRole('button', {name: '2'}))
    expect(screen.getByTestId('roadmap-page')).toHaveTextContent('1')

    fireEvent.click(navigation.getByRole('button', {name: 'Forum'}))
    expect(window.location.hash).toBe('#zitouna/forum')
    fireEvent.click(screen.getByRole('button', {name: 'Load forum pages'}))
    fireEvent.click(within(screen.getByRole('navigation', {name: 'Pagination'})).getByRole('button', {name: '2'}))
    expect(screen.getByTestId('forum-page')).toHaveTextContent('1')
})

it('opens forum and roadmap resources from Discover through their existing routes', async () => {
    const onOpenPost = vi.fn()
    apiMocks.getZitounaFeed.mockResolvedValue([
        {
            area: 'FORUM',
            id: 7,
            title: 'Forum question',
            excerpt: 'A discussion',
            authorId: null,
            authorUsername: null,
            updatedAt: null,
            moderationStatus: 'APPROVED',
            tags: [],
            contentUrl: null,
        },
        {
            area: 'ROADMAP',
            id: 9,
            title: 'Study roadmap',
            excerpt: 'A learning path',
            authorId: null,
            authorUsername: null,
            updatedAt: null,
            moderationStatus: 'APPROVED',
            tags: [],
            contentUrl: null,
        },
    ])

    render(<ZitounaPage onCreatePost={vi.fn()} onRequireLogin={vi.fn()} onOpenPost={onOpenPost}/>)

    const openButtons = await screen.findAllByRole('button', {name: 'Open →'})
    fireEvent.click(openButtons[0])
    expect(onOpenPost).toHaveBeenCalledWith(7)

    fireEvent.click(openButtons[1])
    expect(window.location.hash).toBe('#roadmaps/9')
})

it('opens an FAQ resource from Discover through its tab history entry', async () => {
    apiMocks.getZitounaFeed.mockResolvedValue([{
        area: 'FAQ',
        id: 8,
        title: 'How do I start?',
        excerpt: 'A quick answer',
        authorId: null,
        authorUsername: null,
        updatedAt: null,
        moderationStatus: 'APPROVED',
        tags: [],
        contentUrl: null,
    }])

    render(<ZitounaPage onCreatePost={vi.fn()} onRequireLogin={vi.fn()}/>)

    fireEvent.click(await screen.findByRole('button', {name: 'Open →'}))

    expect(window.location.hash).toBe('#zitouna/faq')
    expect(screen.getByRole('heading', {name: 'Frequently asked questions'})).toBeInTheDocument()

    await act(async () => {
        window.history.back()
        await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    await waitFor(() => expect(window.location.hash).toBe('#zitouna'))
    expect(within(screen.getByRole('navigation', {name: 'Zitouna sections'}))
        .getByRole('button', {name: 'Discover'})).toHaveClass('is-active')
})