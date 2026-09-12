import { useCallback, useEffect, useMemo, useReducer } from 'react'
import type { AnatomyProcess } from './model'

export type ProcessState = { index: number; playing: boolean }
export type ProcessAction = { type: 'play' } | { type: 'pause' } | { type: 'next' } | { type: 'previous' } | { type: 'reset' } | { type: 'goto'; index: number }

export function processReducer(total: number) {
  return (state: ProcessState, action: ProcessAction): ProcessState => {
    switch (action.type) {
      case 'play': return total === 0 ? state : { ...state, playing: true }
      case 'pause': return { ...state, playing: false }
      case 'next': {
        const next = state.index + 1
        return next >= total ? { index: 0, playing: false } : { ...state, index: next }
      }
      case 'previous': return { ...state, index: Math.max(0, state.index - 1) }
      case 'goto': return { ...state, index: Math.max(0, Math.min(action.index, total - 1)) }
      case 'reset': return { index: 0, playing: false }
      default: return state
    }
  }
}

export function useProcessPlayer(process: AnatomyProcess | undefined, reducedMotion: boolean) {
  const total = process?.steps.length ?? 0
  const reducer = useMemo(() => processReducer(total), [total])
  const [state, dispatch] = useReducer(reducer, { index: 0, playing: false })

  useEffect(() => {
    // Reduced motion never auto-advances; the student steps manually.
    if (!state.playing || reducedMotion || total === 0) return
    const id = window.setTimeout(() => dispatch({ type: 'next' }), process?.stepDurationMs ?? 2600)
    return () => window.clearTimeout(id)
  }, [state.playing, state.index, reducedMotion, total, process?.stepDurationMs])

  const step = process?.steps[state.index]
  const highlight = useMemo(() => new Set(step?.highlight ?? []), [step])

  return {
    step,
    index: state.index,
    total,
    playing: state.playing && !reducedMotion,
    highlight,
    play: useCallback(() => dispatch({ type: 'play' }), []),
    pause: useCallback(() => dispatch({ type: 'pause' }), []),
    next: useCallback(() => dispatch({ type: 'next' }), []),
    previous: useCallback(() => dispatch({ type: 'previous' }), []),
    reset: useCallback(() => dispatch({ type: 'reset' }), []),
    goto: useCallback((index: number) => dispatch({ type: 'goto', index }), []),
  }
}
