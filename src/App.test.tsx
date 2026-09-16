import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function cell(board: HTMLElement, x: number, y: number): HTMLElement {
  const el = board.querySelector(`[data-x="${x}"][data-y="${y}"]`)
  if (!el) throw new Error(`no cell ${x},${y}`)
  return el as HTMLElement
}

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in placement and lets the player randomize then start', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App />)
    expect(screen.getByTestId('status')).toHaveTextContent(/Place your Carrier/)
    expect(screen.getByTestId('start')).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /Randomize/ }))
    const board = screen.getByTestId('player-board')
    expect(within(board).getAllByTestId(/^ship-/)).toHaveLength(5)
    expect(screen.getByTestId('start')).toBeEnabled()

    await user.click(screen.getByTestId('start'))
    expect(screen.getByTestId('enemy-board')).toBeInTheDocument()
    expect(screen.getByTestId('status')).toHaveTextContent(/Your turn/)
  })

  it('places a ship manually with a hover ghost and picks it up again', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App />)
    const board = screen.getByTestId('player-board')

    await user.hover(cell(board, 0, 0))
    expect(within(board).getByTestId('ghost').querySelector('.ship-ghost-ok')).not.toBeNull()
    await user.hover(cell(board, 8, 0))
    expect(within(board).getByTestId('ghost').querySelector('.ship-ghost-bad')).not.toBeNull()

    await user.click(cell(board, 0, 0))
    expect(within(board).getByTestId('ship-Carrier')).toBeInTheDocument()
    expect(screen.getByTestId('status')).toHaveTextContent(/Place your Battleship/)

    await user.click(within(board).getByTestId('ship-Carrier'))
    expect(within(board).queryByTestId('ship-Carrier')).toBeNull()
    expect(screen.getByTestId('status')).toHaveTextContent(/Place your Carrier/)
  })

  it('firing at the enemy triggers an AI reply after a delay', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Randomize/ }))
    await user.click(screen.getByTestId('start'))

    const enemy = screen.getByTestId('enemy-board')
    await user.click(cell(enemy, 3, 3))
    expect(cell(enemy, 3, 3)).toBeDisabled()
    expect(screen.getByTestId('status')).toHaveTextContent(/Enemy is firing/)

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByTestId('status')).toHaveTextContent(/Your turn/)
    const player = screen.getByTestId('player-board')
    const fired = player.querySelectorAll('.cell--miss, .cell--hit')
    expect(fired.length).toBe(1)
  })
})
