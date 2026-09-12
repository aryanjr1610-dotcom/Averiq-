import { describe, expect, it } from 'vitest'
import { greeting } from './dashboard-data'

describe('dashboard greeting', () => {
  it('is time aware and uses the real name', () => {
    expect(greeting(new Date('2026-09-09T07:10:00'), 'Op')).toBe('Good morning, Op 👋')
    expect(greeting(new Date('2026-09-09T13:10:00'), 'Op')).toBe('Good afternoon, Op 👋')
    expect(greeting(new Date('2026-09-09T20:10:00'), 'Op')).toBe('Good evening, Op 👋')
  })

  it('omits the name when the profile has none', () => {
    expect(greeting(new Date('2026-09-09T09:00:00'))).toBe('Good morning 👋')
  })
})
