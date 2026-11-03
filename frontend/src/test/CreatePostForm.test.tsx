import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { CreatePostForm } from '../features/forum/components/CreatePostForm'
import type { TagItem } from '../components/TagAutocomplete'

vi.mock('../lib/apiClient', () => ({ getApiErrorMessage: () => 'Unable to create the post.' }))
vi.mock('../features/forum/components/MediaComposer', () => ({
  MediaComposer: () => null,
}))
vi.mock('../components/TagAutocomplete', () => ({
  TagAutocomplete: ({ onChange, onProposalsChange }: {
    onChange: (tags: TagItem[]) => void
    onProposalsChange?: (proposals: { name: string; field: 'TOPIC' }[]) => void
  }) => (
    <>
      <button type="button" onClick={() => onChange([{ id: 8, name: 'Algebra', field: 'TOPIC' }])}>Select approved tag</button>
      <button type="button" onClick={() => onProposalsChange?.([{ name: 'New theorem', field: 'TOPIC' }])}>Propose tag</button>
    </>
  ),
}))

it('submits tag proposals together with a new forum post', async () => {
  const onCreate = vi.fn().mockResolvedValue(undefined)
  render(<CreatePostForm onCreate={onCreate} />)

  fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'A new discussion' } })
  fireEvent.change(screen.getByPlaceholderText('Write your post, or leave this empty and record your experience below'), {
    target: { value: 'A useful discussion body.' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Select approved tag' }))
  fireEvent.click(screen.getByRole('button', { name: 'Propose tag' }))
  fireEvent.click(screen.getByRole('button', { name: 'Post' }))

  await waitFor(() => expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
    tagSelection: expect.objectContaining({
      topicIds: [8],
      proposals: [{ name: 'New theorem', field: 'TOPIC' }],
    }),
  }), []))
})