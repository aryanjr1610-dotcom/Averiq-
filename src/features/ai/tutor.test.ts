import { describe, expect, it } from 'vitest'
import { AI_MODES, clipText, isTutorAllowed, prioritiseContext, MAX_SELECTED_CONTENT } from './tutor'

describe('ai tutor context', () => {
  it('clips oversized content', () => {
    const long = 'x'.repeat(MAX_SELECTED_CONTENT + 500)
    const clipped = clipText(long, MAX_SELECTED_CONTENT)
    expect(clipped.length).toBe(MAX_SELECTED_CONTENT + 1)
    expect(clipped.endsWith('…')).toBe(true)
  })

  it('drops empty fields and truncates derivation steps', () => {
    const context = prioritiseContext({
      subject: 'Physics',
      chapter: '',
      topic: undefined,
      derivationStep: 'y'.repeat(2000),
      blockId: 'field-quantity',
    })
    expect(context.subject).toBe('Physics')
    expect('chapter' in context).toBe(false)
    expect('topic' in context).toBe(false)
    expect(context.derivationStep?.length).toBe(801)
    expect(context.blockId).toBe('field-quantity')
  })

  it('blocks the tutor in exam mode', () => {
    expect(isTutorAllowed({ examMode: false })).toBe(true)
    expect(isTutorAllowed({ examMode: true })).toBe(false)
  })

  it('exposes unique modes', () => {
    const modes = AI_MODES.map((item) => item.mode)
    expect(new Set(modes).size).toBe(modes.length)
  })
})
