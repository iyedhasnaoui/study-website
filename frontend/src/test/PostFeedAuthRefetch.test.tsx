import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

import { PostFeed } from '../features/forum/components/PostFeed'

const auth: { session: { user: { id: number } } | null } = { session: null }
const getForumPosts = vi.fn()

vi.mock('../auth/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../auth/keycloak', () => ({ keycloak: {}, currentToken: vi.fn().mockResolvedValue(null) }))
vi.mock('../features/forum/api/forumApi', () => ({
  getForumPosts: (...args: unknown[]) => getForumPosts(...args),
  deleteForumPost: vi.fn(),
}))

beforeEach(() => {
  auth.session = null
  getForumPosts.mockReset()
})

it('refetches the page once the restored session is known, so page count reflects the viewer', async () => {
  // Anonymous request (Keycloak not initialised yet) sees one page; the signed-in request sees two.
  getForumPosts
    .mockResolvedValueOnce({ content: [], page: 0, size: 10, total: 4, totalPages: 1 })
    .mockResolvedValueOnce({ content: [], page: 0, size: 10, total: 14, totalPages: 2 })
  const onTotalPages = vi.fn()

  const view = render(<PostFeed page={0} size={10} onTotalPages={onTotalPages} />)
  await waitFor(() => expect(onTotalPages).toHaveBeenLastCalledWith(1))

  auth.session = { user: { id: 7 } }
  view.rerender(<PostFeed page={0} size={10} onTotalPages={onTotalPages} />)

  await waitFor(() => expect(onTotalPages).toHaveBeenLastCalledWith(2))
  expect(getForumPosts).toHaveBeenCalledTimes(2)
  expect(getForumPosts).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, size: 10 }))
  expect(screen.getByText('No posts yet.')).toBeInTheDocument()
})
