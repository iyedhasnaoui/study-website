import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

import { getTags } from '../features/zitouna/api'
import { TagAutocomplete } from '../components/TagAutocomplete'

vi.mock('../features/zitouna/api', () => ({
  getTags: vi.fn(),
  TAGS_UPDATED_EVENT: 'study-website:tags-updated',
}))

beforeEach(() => {
  vi.mocked(getTags).mockResolvedValue([
    { id: 1, name: 'Calculus', field: 'TOPIC', type: 'Course', parentId: null },
    { id: 2, name: 'Limits', field: 'SUBTOPIC', type: 'Subtopic', parentId: 1 },
  ] as Awaited<ReturnType<typeof getTags>>)
})

it('allows proposing a subtopic only with an approved topic parent', async () => {
  const onProposalsChange = vi.fn()
  render(<TagAutocomplete selectedTags={[]} onChange={vi.fn()} proposals={[]} onProposalsChange={onProposalsChange} allowProposals />)

  fireEvent.change(await screen.findByPlaceholderText('Type to search existing tags...'), { target: { value: 'Derivatives' } })
  fireEvent.change(screen.getByLabelText('Proposed tag field'), { target: { value: 'SUBTOPIC' } })
  const propose = screen.getByRole('button', { name: 'Propose “Derivatives”' })
  expect(propose).toBeDisabled()

  fireEvent.change(screen.getByLabelText('Proposed subtopic parent'), { target: { value: '1' } })
  fireEvent.click(propose)

  expect(onProposalsChange).toHaveBeenCalledWith([
    { name: 'Derivatives', field: 'SUBTOPIC', parentId: 1 },
  ])
})

it('does not expose proposal controls in ordinary tag-picker contexts', async () => {
  render(<TagAutocomplete selectedTags={[]} onChange={vi.fn()} />)

  fireEvent.change(await screen.findByPlaceholderText('Type to search existing tags...'), { target: { value: 'New topic' } })

  expect(screen.queryByRole('button', { name: 'Propose “New topic”' })).not.toBeInTheDocument()
})

it('limits autocomplete choices to the requested tag field', async () => {
  const onChange = vi.fn()
  const topicTag = { id: 1, name: 'Calculus', field: 'TOPIC' as const }
  const availableTags = [
    topicTag,
    { id: 2, name: 'Berlin University', field: 'INSTITUTION' as const },
  ]
  render(
    <TagAutocomplete
      selectedTags={[]}
      onChange={onChange}
      field="TOPIC"
      availableTags={availableTags}
      placeholder="Search topics..."
      label="Topic"
    />,
  )

  fireEvent.focus(screen.getByPlaceholderText('Search topics...'))

  expect(await screen.findByRole('option', { name: '#Calculus' })).toBeInTheDocument()
  expect(screen.queryByRole('option', { name: '#Berlin University' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('option', { name: '#Calculus' }))
  expect(onChange).toHaveBeenLastCalledWith([topicTag])

  render(
    <TagAutocomplete
      selectedTags={[topicTag]}
      onChange={onChange}
      field="TOPIC"
      availableTags={availableTags}
      placeholder="Search topics..."
      label="Topic"
    />,
  )
  fireEvent.click(screen.getByRole('button', {name: 'Remove tag Calculus'}))
  expect(onChange).toHaveBeenLastCalledWith([])
})