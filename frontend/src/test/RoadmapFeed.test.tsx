import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

import { useAuth } from '../auth/AuthContext'
import type { AppRole } from '../auth/types'
import { getRoadmaps } from '../features/roadmap/api/roadmapApi'
import { RoadmapFeed } from '../features/roadmap/components/RoadmapFeed'
import type { RoadmapResponseDto } from '../features/roadmap/types'

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../features/roadmap/api/roadmapApi', () => ({
  getRoadmaps: vi.fn(),
  deleteRoadmap: vi.fn(),
}))

function auth(isReady: boolean, id: number | null = null, role: AppRole = 'VIEWER') {
  return {
    isReady,
    isAdmin: role === 'ADMIN',
    session: id === null ? null : { user: { id, username: 'student', email: '', role, roles: [role] } },
  } as ReturnType<typeof useAuth>
}

function roadmap(id: number, title: string, tags: string[] = []): RoadmapResponseDto {
  return {
    id, title, tags, description: '', authorId: 7, authorUsername: 'student',
    createdAt: null, updatedAt: null, nodes: [], edges: [],
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

beforeEach(() => {
  vi.mocked(getRoadmaps).mockReset()
})

it('waits for authentication before loading and displays saved tags', async () => {
  vi.mocked(useAuth).mockReturnValue(auth(false))
  vi.mocked(getRoadmaps).mockResolvedValue([roadmap(1, 'My roadmap', ['TUM', 'Algebra'])])
  const { rerender } = render(<RoadmapFeed />)

  expect(getRoadmaps).not.toHaveBeenCalled()
  expect(screen.getByText('Loading roadmaps…')).toBeVisible()

  vi.mocked(useAuth).mockReturnValue(auth(true, 7, 'CONTRIBUTOR'))
  rerender(<RoadmapFeed />)

  expect(await screen.findByText('My roadmap')).toBeVisible()
  expect(screen.getByText('TUM')).toBeVisible()
  expect(screen.getByText('Algebra')).toBeVisible()
  expect(getRoadmaps).toHaveBeenCalledTimes(1)
})

it('reloads for changed viewers and roles and does not show the previous viewer’s results', async () => {
  const nextResults = deferred<RoadmapResponseDto[]>()
  vi.mocked(useAuth).mockReturnValue(auth(true, 7, 'ADMIN'))
  vi.mocked(getRoadmaps)
    .mockResolvedValueOnce([roadmap(1, 'Admin roadmap')])
    .mockReturnValueOnce(nextResults.promise)
    .mockResolvedValueOnce([roadmap(3, 'Other user roadmap')])
  const { rerender } = render(<RoadmapFeed />)
  expect(await screen.findByText('Admin roadmap')).toBeVisible()

  vi.mocked(useAuth).mockReturnValue(auth(true, 7, 'VIEWER'))
  rerender(<RoadmapFeed />)
  expect(screen.queryByText('Admin roadmap')).not.toBeInTheDocument()
  await waitFor(() => expect(getRoadmaps).toHaveBeenCalledTimes(2))
  await act(async () => nextResults.resolve([roadmap(2, 'Viewer roadmap')]))
  expect(screen.getByText('Viewer roadmap')).toBeVisible()

  vi.mocked(useAuth).mockReturnValue(auth(true, 8, 'VIEWER'))
  rerender(<RoadmapFeed />)
  expect(await screen.findByText('Other user roadmap')).toBeVisible()
  expect(screen.queryByText('Viewer roadmap')).not.toBeInTheDocument()
  expect(getRoadmaps).toHaveBeenCalledTimes(3)
})

it('ignores a late response from an earlier filter request', async () => {
  const oldResults = deferred<RoadmapResponseDto[]>()
  const newResults = deferred<RoadmapResponseDto[]>()
  vi.mocked(useAuth).mockReturnValue(auth(true))
  vi.mocked(getRoadmaps).mockReturnValueOnce(oldResults.promise).mockReturnValueOnce(newResults.promise)
  const { rerender } = render(<RoadmapFeed tagIds={[1]} />)
  rerender(<RoadmapFeed tagIds={[2]} />)

  await act(async () => newResults.resolve([roadmap(2, 'Filtered roadmap', ['Algebra'])]))
  await act(async () => oldResults.resolve([roadmap(1, 'Old roadmap')]))

  expect(getRoadmaps).toHaveBeenLastCalledWith({ query: undefined, tags: [2] })
  expect(screen.getByText('Filtered roadmap')).toBeVisible()
  expect(screen.getByText('Algebra')).toBeVisible()
  expect(screen.queryByText('Old roadmap')).not.toBeInTheDocument()
})

it('ignores a late response for a previous viewer', async () => {
  const oldResults = deferred<RoadmapResponseDto[]>()
  const newResults = deferred<RoadmapResponseDto[]>()
  vi.mocked(useAuth).mockReturnValue(auth(true, 7, 'ADMIN'))
  vi.mocked(getRoadmaps).mockReturnValueOnce(oldResults.promise).mockReturnValueOnce(newResults.promise)
  const { rerender } = render(<RoadmapFeed />)

  vi.mocked(useAuth).mockReturnValue(auth(true))
  rerender(<RoadmapFeed />)
  await act(async () => newResults.resolve([roadmap(2, 'Public roadmap')]))
  await act(async () => oldResults.resolve([roadmap(1, 'Private roadmap')]))

  expect(screen.getByText('Public roadmap')).toBeVisible()
  expect(screen.queryByText('Private roadmap')).not.toBeInTheDocument()
})