import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

import { useAuth } from '../auth/AuthContext'
import { RoadmapDetailPage } from '../features/roadmap/RoadmapDetailPage'
import { deleteRoadmap, getRoadmapGraph } from '../features/roadmap/api/roadmapApi'
import type { RoadmapGraphResponseDto } from '../features/roadmap/types'

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }))

vi.mock('../features/roadmap/api/roadmapApi', () => ({
  deleteRoadmap: vi.fn(),
  extractErrorMessage: (error: unknown) => error instanceof Error ? error.message : 'Unable to load roadmap.',
  getRoadmapGraph: vi.fn(),
}))

vi.mock('../features/roadmap/components/RoadmapGraphEditor', () => ({
  RoadmapGraphEditor: () => <div data-testid="roadmap-graph-editor" />,
}))

const graph: RoadmapGraphResponseDto = {
  roadmapId: 42,
  title: 'Linear Algebra Roadmap',
  description: 'A sample roadmap.',
  authorId: 7,
  authorUsername: 'student',
  createdAt: null,
  updatedAt: null,
  nodes: [],
  edges: [],
  advisories: [],
  tags: ['Algebra'],
}

const backToFeed = vi.fn()

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ session: null, isAdmin: false } as ReturnType<typeof useAuth>)
})

it('renders the roadmap after the loading state completes', async () => {
  let resolveGraph!: (value: RoadmapGraphResponseDto) => void
  vi.mocked(getRoadmapGraph).mockReturnValue(new Promise<RoadmapGraphResponseDto>((resolve) => {
    resolveGraph = resolve
  }))

  render(<RoadmapDetailPage roadmapId={42} onBackToFeed={backToFeed} />)

  expect(screen.getByText('Loading roadmap…')).toBeVisible()
  await act(async () => resolveGraph(graph))

  expect(screen.getByRole('heading', { name: graph.title })).toBeVisible()
  expect(screen.getByText('Algebra')).toBeVisible()
  expect(screen.getByTestId('roadmap-graph-editor')).toBeVisible()
})

it('shows a load error and lets the user return to the feed', async () => {
  vi.mocked(getRoadmapGraph).mockRejectedValue(new Error('Roadmap unavailable'))

  render(<RoadmapDetailPage roadmapId={42} onBackToFeed={backToFeed} />)

  expect(await screen.findByText('Roadmap unavailable')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Back to roadmaps' }))
  expect(backToFeed).toHaveBeenCalledOnce()
})

it('allows an admin to delete the roadmap after it loads', async () => {
  vi.mocked(useAuth).mockReturnValue({ session: null, isAdmin: true } as ReturnType<typeof useAuth>)
  vi.mocked(getRoadmapGraph).mockResolvedValue(graph)
  vi.mocked(deleteRoadmap).mockResolvedValue(undefined)
  vi.spyOn(window, 'confirm').mockReturnValue(true)

  render(<RoadmapDetailPage roadmapId={42} onBackToFeed={backToFeed} />)

  fireEvent.click(await screen.findByRole('button', { name: 'Delete roadmap' }))

  await waitFor(() => expect(deleteRoadmap).toHaveBeenCalledWith(42))
  expect(backToFeed).toHaveBeenCalledOnce()
})