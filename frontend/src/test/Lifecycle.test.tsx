import { act, render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import App from '../App'

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ session: null, isAdmin: false, login: vi.fn(), register: vi.fn(), logout: vi.fn() }) }))
it('releases the home interval and hash listener across 30 mount/unmount cycles', () => {
  vi.useFakeTimers()
  const added = vi.spyOn(window, 'addEventListener')
  const removed = vi.spyOn(window, 'removeEventListener')
  try {
    const initialTimers = vi.getTimerCount()
    for (let cycle = 0; cycle < 30; cycle++) {
      const view = render(<App />)
      act(() => { vi.advanceTimersByTime(12600) })
      view.unmount()
      expect(vi.getTimerCount()).toBe(initialTimers)
    }
    const hashHandlers = added.mock.calls.filter(([type]) => type === 'hashchange')
    expect(hashHandlers).toHaveLength(30)
    for (const [type, handler] of hashHandlers) expect(removed).toHaveBeenCalledWith(type, handler)
  } finally { vi.useRealTimers() }
})
