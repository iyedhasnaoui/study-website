import {fireEvent, render, screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {expect, it, vi} from 'vitest'
import {HomePage} from './HomePage'

const cards = [
  ['Explore Zitouna', '#zitouna', 'One place for the knowledge circle.'],
  ['Discover our mission', '#about', 'Understand the idea behind the circle.'],
  ['Open your profile', '#zitouna', 'Your academic identity travels with you.'],
] as const

function renderHome() {
  const actions = [vi.fn(), vi.fn(), vi.fn()]
  render(<HomePage onOpenZitouna={actions[0]} onOpenAbout={actions[1]} onOpenProfile={actions[2]} />)
  return actions
}

it('makes each whole card one named link with no nested interactive elements', () => {
  const actions = renderHome()
  cards.forEach(([name, href, title], index) => {
    const link = screen.getByRole('link', {name})
    expect(link).toHaveAttribute('href', href)
    expect(link).toHaveClass(`feature-card--${index + 1}`)
    expect(link.querySelector('a, button, input, [tabindex]')).toBeNull()
    fireEvent.click(within(link).getByRole('heading', {name: title}))
    expect(actions[index]).toHaveBeenCalledTimes(1)
  })
})

it('supports tabbing through each card once and activating it with Enter', async () => {
  const user = userEvent.setup()
  const actions = renderHome()
  screen.getByRole('button', {name: /Contribute/}).focus()
  for (const [index, [name]] of cards.entries()) {
    await user.tab()
    expect(screen.getByRole('link', {name})).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(actions[index]).toHaveBeenCalledTimes(1)
  }
})

it('activates cards with touch without a hover step', async () => {
  const user = userEvent.setup()
  const actions = renderHome()
  for (const [index, [name]] of cards.entries()) {
    await user.pointer({keys: '[TouchA]', target: screen.getByRole('link', {name})})
    expect(actions[index]).toHaveBeenCalledTimes(1)
  }
})

it('leaves modified clicks to native link navigation', () => {
  const actions = renderHome()
  for (const [name] of cards) {
    const link = screen.getByRole('link', {name})
    for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey']) {
      expect(fireEvent.click(link, {[modifier]: true})).toBe(true)
    }
  }
  actions.forEach((action) => expect(action).not.toHaveBeenCalled())
})
