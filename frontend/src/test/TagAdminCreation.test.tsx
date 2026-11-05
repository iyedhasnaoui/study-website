import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'

import { ZitounaPage } from '../features/zitouna/ZitounaPage'
import { apiClient } from '../lib/apiClient'

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 1, role: 'ADMIN', roles: ['ADMIN'] } }, isAdmin: true }),
}))
vi.mock('../auth/keycloak', () => ({ keycloak: {}, currentToken: vi.fn().mockResolvedValue(null) }))

it('creates an approved tag from the admin queue and posts to the admin endpoint', async () => {
  const tagType = { id: 14, name: 'Course', field: 'TOPIC', minimumInstitutions: 0, minimumPrograms: 0, active: true }
  vi.spyOn(apiClient, 'get').mockImplementation(async (url) => ({
    data: url === '/api/tag-types' ? [tagType] : [],
  }) as never)
  const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 25 } } as never)
  render(<QueryClientProvider client={new QueryClient()}>
    <ZitounaPage onCreatePost={vi.fn()} onOpenRoadmaps={vi.fn()} onRequireLogin={vi.fn()} />
  </QueryClientProvider>)

  await userEvent.click(screen.getByRole('button', { name: 'Admin queue' }))
  const form = screen.getByRole('heading', { name: 'Create an approved tag' }).closest('form')!
  expect(await within(form).findByRole('option', { name: 'Course · Topic' })).toBeInTheDocument()
  fireEvent.change(within(form).getByLabelText('Name'), { target: { value: 'Directly created topic' } })
  await userEvent.click(within(form).getByRole('button', { name: 'Create approved tag' }))

  await waitFor(() => expect(post).toHaveBeenCalledWith('/api/admin/tags', {
    name: 'Directly created topic', typeId: 14,
  }))
  expect(await screen.findByText('Approved tag created.')).toBeVisible()
})