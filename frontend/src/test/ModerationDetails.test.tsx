import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ModerationDetails } from '../features/zitouna/components/ModerationDetails'
import type { ModerationQueueItem } from '../features/zitouna/types'

const item: ModerationQueueItem = { area: 'LEARNING_MATERIAL', id: 1, title: 'Local notes', authorId: 1,
  authorUsername: 'local-author', status: 'PENDING', submittedAt: '2026-10-28T10:00:00',
  details: { description: 'Useful notes.\nSecond paragraph.', type: 'PDF', tags: ['Geometry'], filename: 'notes.pdf' } }

it('renders the material description as readable text with metadata', () => {
  const view = render(<ModerationDetails item={item} />)
  expect(screen.getByText('Description')).toBeVisible()
  expect(screen.getByText(/Useful notes/).textContent).toBe('Useful notes.\nSecond paragraph.')
  expect(screen.getByText('PDF')).toBeVisible()
  expect(screen.getByText('Geometry')).toBeVisible()
  expect(screen.getByText('notes.pdf')).toBeVisible()
  expect(view.container.querySelector('time')).toHaveAttribute('dateTime', item.submittedAt)
  expect(view.container.querySelector('pre')).toBeNull()
})

it.each(['FORUM', 'ROADMAP'] as const)('preserves %s review content', (area) => {
  render(<ModerationDetails item={{ ...item, area, details: area === 'FORUM' ? { content: 'Forum text' } : { description: 'Roadmap text' } }} />)
  expect(screen.getByText(area === 'FORUM' ? 'Forum text' : 'Roadmap text')).toBeVisible()
})
