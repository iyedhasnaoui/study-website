import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

import { NodeLinksEditor, NodeLinksReader } from '../features/roadmap/components/RoadmapNodeLinks'
import { linkText, normaliseWebAddress } from '../features/roadmap/nodeLinks'
import type { RoadmapLinkSuggestion, RoadmapNodeLink, RoadmapNodeVouch } from '../features/roadmap/types'
import { getZitounaFeed } from '../features/zitouna/api'

vi.mock('../features/zitouna/api', () => ({ getZitounaFeed: vi.fn() }))

const thread: RoadmapNodeLink = {
  kind: 'INTERNAL', targetType: 'FORUM', targetId: 4, url: null, label: 'Which criteria are examined?',
  insideTag: true, available: true, replyCount: 4,
}
const lectures: RoadmapNodeLink = {
  kind: 'EXTERNAL', targetType: null, targetId: null, url: 'https://youtube.com/lectures', label: 'lecture series',
  insideTag: false, available: true, replyCount: null,
}
const gone: RoadmapNodeLink = {
  kind: 'INTERNAL', targetType: 'FAQ', targetId: 8, url: null, label: 'Old answer',
  insideTag: false, available: false, replyCount: null,
}
const formulas: RoadmapLinkSuggestion = {
  targetType: 'LEARNING_MATERIAL', targetId: 12, title: 'Analysis 1 — Formelsammlung', replyCount: null,
}
const amine: RoadmapNodeVouch = { id: 3, personName: 'Amine', note: 'wrote the forum thread (2025)', status: 'APPROVED' }
const lina: RoadmapNodeVouch = { id: 5, personName: 'Lina', note: null, status: 'PENDING' }

function renderEditor(overrides: Partial<Parameters<typeof NodeLinksEditor>[0]> = {}) {
  const props = {
    roadmapId: 1,
    nodeType: 'PRIMARY' as const,
    links: [thread, lectures],
    vouches: [amine, lina],
    suggestions: [{ targetType: 'FORUM' as const, targetId: 4, title: thread.label, replyCount: 4 }, formulas],
    suggestionsError: null,
    roadmapHasTags: true,
    onLinksChange: vi.fn(),
    onVouchesChange: vi.fn(),
    ...overrides,
  }
  render(<NodeLinksEditor {...props} />)
  return props
}

it('groups links by tag and offers same-tag content that is not linked yet', async () => {
  const props = renderEditor()

  const inside = screen.getByRole('region', { name: 'Links inside the tag' })
  expect(within(inside).getByRole('link', { name: 'Forum: “Which criteria are examined?” (4)' })).toBeVisible()
  // The suggested thread is already linked, so only the material is still on offer.
  expect(within(inside).queryByRole('button', { name: /^\+ Forum/ })).toBeNull()
  await userEvent.click(within(inside).getByRole('button', { name: '+ Learning material: Analysis 1 — Formelsammlung' }))
  expect(props.onLinksChange).toHaveBeenCalledWith([thread, lectures, expect.objectContaining({
    kind: 'INTERNAL', targetType: 'LEARNING_MATERIAL', targetId: 12, insideTag: true,
  })])

  const outside = screen.getByRole('region', { name: 'Links outside the tag' })
  const external = within(outside).getByRole('link', { name: '↗ lecture series' })
  expect(external).toHaveAttribute('href', 'https://youtube.com/lectures')
  expect(external).toHaveAttribute('target', '_blank')
  await userEvent.click(within(outside).getByRole('button', { name: 'Remove lecture series' }))
  expect(props.onLinksChange).toHaveBeenLastCalledWith([thread])
})

it('adds a web page by hand and refuses anything that is not one', async () => {
  const props = renderEditor({ links: [] })

  await userEvent.click(screen.getByRole('button', { name: '+ add a link' }))
  await userEvent.click(screen.getByRole('button', { name: 'Web page' }))
  await userEvent.type(screen.getByRole('textbox', { name: 'Web address' }), 'javascript:alert(1)')
  await userEvent.click(screen.getByRole('button', { name: 'Add link' }))
  expect(screen.getByText(/Enter a web address/)).toBeVisible()
  expect(props.onLinksChange).not.toHaveBeenCalled()

  await userEvent.clear(screen.getByRole('textbox', { name: 'Web address' }))
  await userEvent.type(screen.getByRole('textbox', { name: 'Web address' }), 'www.tum.de/en/studies')
  await userEvent.type(screen.getByRole('textbox', { name: 'Link title' }), 'TUM study guide')
  await userEvent.click(screen.getByRole('button', { name: 'Add link' }))
  expect(props.onLinksChange).toHaveBeenCalledWith([expect.objectContaining({
    kind: 'EXTERNAL', url: 'https://www.tum.de/en/studies', label: 'TUM study guide', insideTag: false,
  })])
})

it('links other Zitun content found by search, inside the tag only when the website suggested it', async () => {
  vi.mocked(getZitounaFeed).mockResolvedValue([
    { area: 'ROADMAP', id: 1, title: 'This roadmap', excerpt: '', authorId: null, authorUsername: null,
      updatedAt: null, moderationStatus: 'APPROVED', tags: [], contentUrl: null },
    { area: 'ROADMAP', id: 9, title: 'Numerics at TUM', excerpt: '', authorId: null, authorUsername: null,
      updatedAt: null, moderationStatus: 'APPROVED', tags: [], contentUrl: null },
  ])
  const props = renderEditor({ links: [] })

  await userEvent.click(screen.getByRole('button', { name: '+ add a link' }))
  await userEvent.type(screen.getByRole('textbox', { name: 'Search Zitun' }), 'Numerics')
  await userEvent.click(await screen.findByRole('button', { name: /Numerics at TUM/ }))

  expect(getZitounaFeed).toHaveBeenCalledWith({ query: 'Numerics' })
  expect(screen.queryByText('This roadmap')).toBeNull()
  expect(props.onLinksChange).toHaveBeenCalledWith([expect.objectContaining({
    kind: 'INTERNAL', targetType: 'ROADMAP', targetId: 9, insideTag: false,
  })])
})

it('shows each vouch with its review state and adds new people as waiting', async () => {
  const props = renderEditor()

  const vouched = screen.getByRole('region', { name: 'Vouched by' })
  expect(within(vouched).getByText('✓ Amine — wrote the forum thread (2025)')).toBeVisible()
  expect(within(vouched).getByText(/waiting for an admin/)).toBeVisible()

  await userEvent.click(within(vouched).getByRole('button', { name: '+ add a person' }))
  await userEvent.type(screen.getByRole('textbox', { name: 'Name of the person' }), 'Sami')
  await userEvent.type(screen.getByRole('textbox', { name: 'What they did' }), 'passed in 2024')
  await userEvent.click(screen.getByRole('button', { name: 'Add person' }))
  expect(props.onVouchesChange).toHaveBeenCalledWith([amine, lina,
    { id: null, personName: 'Sami', note: 'passed in 2024', status: 'PENDING' }])
})

it('does not offer vouches on a note, and warns when a step with vouches becomes one', () => {
  renderEditor({ nodeType: 'NOTE' })
  expect(screen.queryByRole('region', { name: 'Vouched by' })).toBeNull()
  expect(screen.getByText(/will be dropped when you save/)).toBeVisible()
})

it('explains why there is nothing to suggest', () => {
  renderEditor({ links: [], suggestions: [], roadmapHasTags: false })
  expect(screen.getByText(/has no tags yet/)).toBeVisible()
})

it('shows readers working links and accepted vouches only', () => {
  render(<NodeLinksReader links={[thread, lectures, gone]} vouches={[amine, lina]} />)

  expect(screen.getByRole('link', { name: 'Forum: “Which criteria are examined?” (4)' }))
    .toHaveAttribute('href', '#forum/4')
  expect(screen.getByRole('link', { name: '↗ lecture series' })).toBeVisible()
  expect(screen.queryByText(/Old answer/)).toBeNull()
  expect(screen.getByText(/Confirmed by/).closest('p'))
    .toHaveTextContent('✓ Confirmed by Amine — wrote the forum thread (2025)')
  expect(screen.queryByText(/Lina/)).toBeNull()
})

it('formats and checks links', () => {
  expect(linkText(gone)).toBe('FAQ: Old answer')
  expect(normaliseWebAddress('youtube.com/watch?v=1')).toBe('https://youtube.com/watch?v=1')
  expect(normaliseWebAddress('http://example.org')).toBe('http://example.org/')
  expect(normaliseWebAddress('javascript:alert(1)')).toBeNull()
  expect(normaliseWebAddress('data:text/html,hi')).toBeNull()
  expect(normaliseWebAddress('not a url')).toBeNull()
})
