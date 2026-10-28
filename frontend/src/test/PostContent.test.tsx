import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { PostContent } from '../features/forum/components/PostContent'

it('shows short posts fully without a toggle', () => {
  render(<PostContent content={'First paragraph.\n\nSecond paragraph.'} />)
  expect(screen.getByText(/First paragraph/).textContent).toBe('First paragraph.\n\nSecond paragraph.')
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

it('previews long posts and expands and collapses with keyboard interaction', async () => {
  const user = userEvent.setup()
  const content = 'First paragraph.\n\n' + 'Detailed experience. '.repeat(40) + '\nFinal paragraph.'
  render(<PostContent content={content} />)
  const button = screen.getByRole('button', { name: 'Read more' })
  const paragraph = document.getElementById(button.getAttribute('aria-controls')!)!
  expect(paragraph.textContent!.length).toBeLessThan(content.length)
  expect(paragraph).toHaveClass('whitespace-pre-wrap')
  expect(button).toHaveAttribute('aria-expanded', 'false')
  await user.tab()
  await user.keyboard('{Enter}')
  expect(paragraph.textContent).toBe(content)
  expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true')
  await user.click(screen.getByRole('button', { name: 'Show less' }))
  expect(paragraph.textContent).not.toContain('Final paragraph.')
  expect(screen.getByRole('button', { name: 'Read more' })).toHaveAttribute('aria-expanded', 'false')
})
