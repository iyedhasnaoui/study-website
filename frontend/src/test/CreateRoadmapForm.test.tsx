import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { createRoadmap } from '../features/roadmap/api/roadmapApi'
import { CreateRoadmapForm } from '../features/roadmap/components/CreateRoadmapForm'
import type { RoadmapResponseDto } from '../features/roadmap/types'
import type { TagItem } from '../components/TagAutocomplete'

vi.mock('../features/roadmap/api/roadmapApi', () => ({ createRoadmap: vi.fn() }))
vi.mock('../lib/apiClient', () => ({ getApiErrorMessage: () => 'Unable to create roadmap.' }))
vi.mock('../components/TagAutocomplete', () => ({
  TagAutocomplete: ({ onChange, onProposalsChange }: {
    onChange: (tags: TagItem[]) => void
    onProposalsChange?: (proposals: { name: string; field: 'TOPIC' }[]) => void
  }) => (
    <>
      <button type="button" onClick={() => onChange([
        { id: 1, name: 'TUM', field: 'INSTITUTION' },
        { id: 2, name: 'Algebra', field: 'TOPIC' },
      ])}>Select tags</button>
      <button type="button" onClick={() => onProposalsChange?.([{ name: 'New concept', field: 'TOPIC' }])}>Propose tag</button>
    </>
  ),
}))

it('sends selected tags in their matching tag-selection fields', async () => {
  vi.mocked(createRoadmap).mockResolvedValue({ id: 42 } as RoadmapResponseDto)
  const onCreated = vi.fn()
  render(<CreateRoadmapForm onCreated={onCreated} />)

  fireEvent.change(screen.getByPlaceholderText('e.g. Frontend Foundations'), { target: { value: 'Math' } })
  fireEvent.click(screen.getByRole('button', { name: 'Select tags' }))
  fireEvent.click(screen.getByRole('button', { name: 'Propose tag' }))
  fireEvent.click(screen.getByRole('button', { name: 'Create roadmap' }))

  await waitFor(() => expect(createRoadmap).toHaveBeenCalledWith({
    title: 'Math', description: null,
    tagSelection: {
      homeInstitutionId: 1, partnerInstitutionId: null, institutionIds: [1],
      programIds: undefined, topicIds: [2], subtopicIds: undefined,
      proposals: [{ name: 'New concept', field: 'TOPIC' }],
    },
  }))
  expect(onCreated).toHaveBeenCalledWith(42)
})