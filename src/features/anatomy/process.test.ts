import { describe, expect, it } from 'vitest'
import { processReducer } from './process'

const reduce = processReducer(3)

describe('anatomy process engine', () => {
  it('steps forward and wraps back to the start without looping playback', () => {
    let state = { index: 0, playing: true }
    state = reduce(state, { type: 'next' })
    state = reduce(state, { type: 'next' })
    expect(state.index).toBe(2)
    state = reduce(state, { type: 'next' })
    expect(state).toEqual({ index: 0, playing: false })
  })

  it('clamps navigation and resets', () => {
    expect(reduce({ index: 0, playing: false }, { type: 'previous' }).index).toBe(0)
    expect(reduce({ index: 0, playing: false }, { type: 'goto', index: 9 }).index).toBe(2)
    expect(reduce({ index: 2, playing: true }, { type: 'reset' })).toEqual({ index: 0, playing: false })
  })

  it('refuses to play an empty process', () => {
    expect(processReducer(0)({ index: 0, playing: false }, { type: 'play' }).playing).toBe(false)
  })
})
