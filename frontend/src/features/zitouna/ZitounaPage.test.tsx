import {fireEvent, render, screen, waitFor, within} from '@testing-library/react'
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
    PostFeed: ({query, tagIds}: {query?: string; tagIds?: number[]}) => (
        <div data-testid="forum-filters">{JSON.stringify({query, tagIds})}</div>
    ),
}))
vi.mock('../roadmap/RoadmapPage', () => ({
    RoadmapPage: ({sharedFilters}: {sharedFilters?: {query?: string; tagIds: number[]}}) => (
        <div data-testid="roadmap-filters">{JSON.stringify(sharedFilters)}</div>
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
    apiMocks.getTags.mockResolvedValue(tags)
    apiMocks.getZitounaFeed.mockResolvedValue([])
    apiMocks.getLearningMaterials.mockResolvedValue([])
    apiMocks.getFaq.mockResolvedValue([])
})

it('shares search and field-specific tag filters across Zitouna content tabs', async () => {
    const {container} = render(
        <ZitounaPage onCreatePost={vi.fn()} onOpenRoadmaps={vi.fn()} onRequireLogin={vi.fn()}/>,
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