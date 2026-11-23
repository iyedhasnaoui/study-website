import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { ForumPostPage } from '../features/forum/ForumPostPage'
import { getForumPostById } from '../features/forum/api/forumApi'
import type { ForumPostResponseDto } from '../features/forum/types'

vi.mock('../features/forum/api/forumApi', () => ({ getForumPostById: vi.fn() }))
vi.mock('../features/forum/components/ReplyList', () => ({
  ReplyList: () => <div>Post replies</div>,
}))

const post: ForumPostResponseDto = {
  id: 1, title: 'Published discussion', content: 'Content', authorId: 1, authorUsername: 'author',
  tags: [], moderationStatus: 'APPROVED', moderationNote: null, attachments: [],
  createdAt: null, updatedAt: null, replyCount: 0,
}

it('omits the reply controls for a rejected post visible to its author', async () => {
  vi.mocked(getForumPostById).mockResolvedValue({ ...post, moderationStatus: 'REJECTED' })
  render(<ForumPostPage postId={1} onBack={vi.fn()} />)
  expect(await screen.findByRole('heading', { name: post.title })).toBeVisible()
  expect(screen.queryByText('Post replies')).not.toBeInTheDocument()
})

it('clears the previous post when navigating to a post that cannot be read', async () => {
  vi.mocked(getForumPostById).mockResolvedValueOnce(post).mockRejectedValueOnce(new Error('Post unavailable'))
  const { rerender } = render(<ForumPostPage postId={1} onBack={vi.fn()} />)
  expect(await screen.findByText('Post replies')).toBeVisible()
  rerender(<ForumPostPage postId={2} onBack={vi.fn()} />)
  expect(await screen.findByText('Post unavailable')).toBeVisible()
  expect(screen.queryByRole('heading', { name: post.title })).not.toBeInTheDocument()
  expect(screen.queryByText('Post replies')).not.toBeInTheDocument()
})
