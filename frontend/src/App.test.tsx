import {act, fireEvent, render, screen, waitFor} from '@testing-library/react'
import {beforeEach, expect, it, vi} from 'vitest'
import App from './App'

const mockZitounaMounted = vi.hoisted(() => vi.fn())

vi.mock('./auth/AuthContext', () => ({
  useAuth: () => ({session: null, logout: vi.fn(), login: vi.fn(), register: vi.fn(), isAdmin: false}),
}))
vi.mock('./components/Navbar', () => ({
  Navbar: ({onNavigateZitouna}: {onNavigateZitouna: () => void}) => (
    <button type="button" onClick={onNavigateZitouna}>Visit Zitouna</button>
  ),
}))
vi.mock('./features/zitouna/ZitounaPage', async () => {
  const {useEffect, useState} = await import('react')

  return {
    ZitounaPage: ({onOpenPost}: {onOpenPost?: (postId: number) => void}) => {
      const [count, setCount] = useState(0)
      useEffect(() => mockZitounaMounted(), [])

      return (
        <div data-testid="zitouna-state">{count}
          <button type="button" onClick={() => setCount((value) => value + 1)}>Change list state</button>
          <button type="button" onClick={() => onOpenPost?.(42)}>Open forum post</button>
          <button type="button" onClick={() => { window.location.hash = '#roadmaps/29' }}>Open roadmap</button>
        </div>
      )
    },
  }
})
vi.mock('./features/forum/ForumPostPage', () => ({
  ForumPostPage: ({onBack}: {onBack: () => void}) => (
    <>
      <div>Forum post detail</div>
      <button type="button" onClick={onBack}>Back to Forum</button>
    </>
  ),
}))
vi.mock('./features/forum/ForumFeedPage', () => ({
  ForumFeedPage: () => <div>Forum feed</div>,
}))
vi.mock('./features/forum/CreatePostPage', () => ({
  CreatePostPage: () => <div>Create post</div>,
}))
vi.mock('./features/roadmap/RoadmapPage', () => ({
  RoadmapPage: ({onBackToFeed}: {onBackToFeed: () => void}) => (
    <>
      <div>Roadmap detail</div>
      <button type="button" onClick={() => { window.location.hash = '#roadmaps/30' }}>Open another roadmap</button>
      <button type="button" onClick={onBackToFeed}>Back to Roadmaps</button>
    </>
  ),
}))
vi.mock('./pages/HomePage', () => ({HomePage: () => <div>Home</div>}))
vi.mock('./pages/AboutPage', () => ({AboutPage: () => <div>About</div>}))
vi.mock('./features/admin/AdminUsersPage', () => ({AdminUsersPage: () => <div>Admin</div>}))

beforeEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  window.history.replaceState(null, '', '/')
  Object.defineProperty(window, 'scrollY', {configurable: true, value: 0})
})

it('returns from a forum post to the retained Zitouna page and restores its scroll position', async () => {
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  Object.defineProperty(window, 'scrollY', {configurable: true, value: 420})
  render(<App />)

  fireEvent.click(screen.getByRole('button', {name: 'Visit Zitouna'}))
  fireEvent.click(screen.getByRole('button', {name: 'Change list state'}))
  fireEvent.scroll(window)
  fireEvent.click(screen.getByRole('button', {name: 'Open forum post'}))

  expect(await screen.findByText('Forum post detail')).toBeInTheDocument()
  expect(screen.getByTestId('zitouna-state')).toHaveTextContent('1')
  expect(mockZitounaMounted).toHaveBeenCalledTimes(1)

  scrollTo.mockClear()
  await act(async () => {
    window.history.back()
    await new Promise((resolve) => window.setTimeout(resolve, 0))
  })

  await waitFor(() => expect(window.location.hash).toBe('#zitouna'))
  expect(screen.getByTestId('zitouna-state')).toHaveTextContent('1')
  expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({top: 420}))

  await act(async () => {
    window.history.forward()
    await new Promise((resolve) => window.setTimeout(resolve, 0))
  })
  expect(await screen.findByText('Forum post detail')).toBeInTheDocument()
})

it('returns from a roadmap detail to its retained Zitouna tab', async () => {
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  Object.defineProperty(window, 'scrollY', {configurable: true, value: 320})
  window.history.replaceState(null, '', '/#zitouna/roadmaps')
  render(<App />)

  fireEvent.scroll(window)
  fireEvent.click(screen.getByRole('button', {name: 'Open roadmap'}))
  expect(await screen.findByText('Roadmap detail')).toBeInTheDocument()
  scrollTo.mockClear()

  await act(async () => {
    window.history.back()
    await new Promise((resolve) => window.setTimeout(resolve, 0))
  })

  await waitFor(() => expect(window.location.hash).toBe('#zitouna/roadmaps'))
  expect(screen.getByTestId('zitouna-state')).toBeInTheDocument()
  expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({top: 320}))
})

it('restores the originating forum scroll position from the detail Back button', async () => {
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  Object.defineProperty(window, 'scrollY', {configurable: true, value: 275})
  window.history.replaceState(null, '', '/#zitouna/forum')
  render(<App />)

  fireEvent.scroll(window)
  fireEvent.click(screen.getByRole('button', {name: 'Open forum post'}))
  expect(await screen.findByText('Forum post detail')).toBeInTheDocument()
  scrollTo.mockClear()

  fireEvent.click(screen.getByRole('button', {name: 'Back to Forum'}))

  await waitFor(() => expect(window.location.hash).toBe('#zitouna/forum'))
  expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({top: 275}))
})

it('returns from consecutive roadmap details to the original tab and restores its scroll position', async () => {
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  Object.defineProperty(window, 'scrollY', {configurable: true, value: 365})
  window.history.replaceState(null, '', '/#zitouna/roadmaps')
  render(<App />)

  fireEvent.scroll(window)
  fireEvent.click(screen.getByRole('button', {name: 'Open roadmap'}))
  expect(await screen.findByText('Roadmap detail')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: 'Open another roadmap'}))
  await waitFor(() => expect(window.location.hash).toBe('#roadmaps/30'))
  scrollTo.mockClear()

  fireEvent.click(screen.getByRole('button', {name: 'Back to Roadmaps'}))

  await waitFor(() => expect(window.location.hash).toBe('#zitouna/roadmaps'))
  expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({top: 365}))
})

it('does not write browser history state for scroll events', async () => {
  render(<App />)
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0))
  })
  const replaceState = vi.spyOn(window.history, 'replaceState')

  for (let scrollY = 1; scrollY <= 10; scrollY += 1) {
    Object.defineProperty(window, 'scrollY', {configurable: true, value: scrollY})
    fireEvent.scroll(window)
  }

  expect(replaceState).not.toHaveBeenCalled()
})

it('continues to render a directly opened roadmap detail without a prior Zitouna visit', () => {
  window.history.replaceState(null, '', '/#roadmaps/29')

  render(<App />)

  expect(screen.getByText('Roadmap detail')).toBeInTheDocument()
  expect(mockZitounaMounted).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', {name: 'Back to Roadmaps'}))
  expect(window.location.hash).toBe('#zitouna/roadmaps')
})

it('continues to render a directly opened forum post without a prior Zitouna visit', () => {
  window.history.replaceState(null, '', '/#forum/42')

  render(<App />)

  expect(screen.getByText('Forum post detail')).toBeInTheDocument()
  expect(mockZitounaMounted).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', {name: 'Back to Forum'}))
  expect(window.location.hash).toBe('#zitouna/forum')
})

it('preserves scroll position when switching between Zitouna tabs', async () => {
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  Object.defineProperty(window, 'scrollY', {configurable: true, value: 500})
  window.history.replaceState(null, '', '/#zitouna/forum')
  render(<App />)

  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0))
  })
  // Simulate scrolling within the forum tab
  fireEvent.scroll(window)
  scrollTo.mockClear()

  // Switch to the roadmaps tab by triggering hash change
  await act(async () => {
    window.location.hash = '#zitouna/roadmaps'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    await new Promise((resolve) => window.setTimeout(resolve, 0))
  })

  expect(window.location.hash).toBe('#zitouna/roadmaps')
  // Should scroll to the preserved position (500), not to 0
  expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({top: 500}))
})