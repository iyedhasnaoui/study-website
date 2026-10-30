import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
import { ZitounaPage } from '../features/zitouna/ZitounaPage'
import { apiClient } from '../lib/apiClient'

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ session: { user: { id: 1, role: 'ADMIN', roles: ['ADMIN'] } }, role: 'ADMIN', isAdmin: true, canContribute: true }) }))
vi.mock('../auth/keycloak', () => ({ keycloak: {}, currentToken: vi.fn().mockResolvedValue(null) }))

it('shows material descriptions and submits the version of the forum revision reviewed', async () => {
  const queue = [
    { area: 'LEARNING_MATERIAL', id: 1, title: 'Local notes', authorUsername: 'Local author', submittedAt: null,
      details: { description: 'Material description for review', type: 'PDF', tags: ['Geometry'] } },
    { area: 'FORUM', id: 2, title: 'Proposed title', authorUsername: 'Contributor', submittedAt: null,
      details: { reviewKind: 'Edited post awaiting approval', content: 'Proposed text', publishedContent: 'Public text', version: 5 } },
  ]
  vi.spyOn(apiClient, 'get').mockImplementation((url) => Promise.resolve({ data: url === '/api/admin/moderation' ? queue : [] }))
  const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: undefined })
  render(<QueryClientProvider client={new QueryClient()}><ZitounaPage onCreatePost={vi.fn()}
    onOpenForum={vi.fn()} onOpenRoadmaps={vi.fn()} onRequireLogin={vi.fn()} /></QueryClientProvider>)
  await userEvent.click(screen.getByRole('button', { name: 'Admin queue' }))
  expect(await screen.findByText('Material description for review')).toBeVisible()
  expect(screen.getByText(/Local author/)).toBeVisible()
  const card = screen.getByRole('heading', { name: 'Proposed title' }).closest('article')!
  expect(within(card).getByText('Proposed text')).toBeVisible()
  expect(within(card).getByText('Public text')).toBeVisible()
  await userEvent.click(within(card).getByRole('button', { name: 'Accept' }))
  await waitFor(() => expect(post).toHaveBeenCalledWith('/api/admin/moderation/FORUM/2/approve', { note: '', version: 5 }))
})
