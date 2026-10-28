import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { PostCard } from '../features/forum/components/PostCard'
import type { ForumPostResponseDto } from '../features/forum/types'

const auth = vi.hoisted(() => ({ session: null as null | { user: { id: number } }, role: null as null | 'VIEWER' | 'CONTRIBUTOR' | 'ADMIN' }))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../features/forum/api/forumApi', () => ({ updatePost: vi.fn() }))
import { updatePost } from '../features/forum/api/forumApi'

const post: ForumPostResponseDto = { id: 7, title: 'Local discussion', content: 'Original content', authorId: 1,
  authorUsername: 'author', tags: [], attachments: [], createdAt: null, updatedAt: null }
const onDelete = vi.fn()
beforeEach(() => { auth.session = null; auth.role = null })

it.each(['anonymous', 'viewer', 'other contributor'])('hides edit/delete for %s', (kind) => {
  if (kind !== 'anonymous') auth.session = { user: { id: kind === 'viewer' ? 1 : 2 } }
  auth.role = kind === 'other contributor' ? 'CONTRIBUTOR' : kind === 'viewer' ? 'VIEWER' : null
  render(<PostCard post={post} onDelete={onDelete} />)
  expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
})

it.each(['own contributor', 'other admin'])('allows edit/delete for %s', async (kind) => {
  auth.session = { user: { id: kind === 'own contributor' ? 1 : 2 } }
  auth.role = kind === 'other admin' ? 'ADMIN' : 'CONTRIBUTOR'
  vi.mocked(updatePost).mockResolvedValue({ ...post, content: 'Edited content' })
  const onUpdated = vi.fn()
  render(<PostCard post={post} onDelete={onDelete} onUpdated={onUpdated} />)
  await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
  await userEvent.clear(screen.getByRole('textbox', { name: 'Content' }))
  await userEvent.type(screen.getByRole('textbox', { name: 'Content' }), 'Edited content')
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(updatePost).toHaveBeenCalledWith(7, { title: post.title, content: 'Edited content' })
  expect(onUpdated).toHaveBeenCalled()
  expect(screen.getByRole('status')).toHaveTextContent('Changes submitted for admin approval')
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
  expect(onDelete).toHaveBeenCalledWith(7)
})

it('closes the editor when the session loses permission', async () => {
  auth.session = { user: { id: 1 } }; auth.role = 'CONTRIBUTOR'
  const view = render(<PostCard post={post} onDelete={onDelete} />)
  await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
  auth.role = 'VIEWER'
  view.rerender(<PostCard post={post} onDelete={onDelete} />)
  expect(screen.queryByRole('textbox', { name: 'Content' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
})
