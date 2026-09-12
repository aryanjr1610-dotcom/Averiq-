import { describe, expect, it } from 'vitest'
import { bandFor, computeMastery, recencyWeight, weightedAccuracy, weightedCompletion } from './mastery'
import { MASTERY_CONFIG } from './model'

const NOW = Date.parse('2026-09-09T12:00:00Z')
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString()
const attempt = (correct: boolean, days: number) => ({ topicId: 't1', correct, at: daysAgo(days) })

describe('mastery model', () => {
  it('never concludes mastery below the evidence threshold', () => {
    const result = computeMastery({ topicId: 't1', scope: 'board', attempts: [attempt(false, 1)], readingProgress: 100 }, NOW)
    expect(result.band).toBe('insufficient')
    expect(result.score).toBeNull()
    expect(result.reasons[0]).toContain(`${MASTERY_CONFIG.minAttempts}`)
  })

  it('keeps reading separate from mastery', () => {
    const attempts = Array.from({ length: 8 }, (_, index) => attempt(index < 3, index + 1))
    const result = computeMastery({ topicId: 't1', scope: 'board', attempts, readingProgress: 100 }, NOW)
    expect(result.readingProgress).toBe(100)
    expect(result.score).not.toBeNull()
    expect(result.score!).toBeLessThan(75)
  })

  it('weights recent attempts more than old ones', () => {
    expect(recencyWeight(daysAgo(0), NOW)).toBeGreaterThan(recencyWeight(daysAgo(MASTERY_CONFIG.halfLifeDays), NOW))
    const recentGood = weightedAccuracy([attempt(true, 0), attempt(false, 60)], NOW) ?? 0
    const recentBad = weightedAccuracy([attempt(false, 0), attempt(true, 60)], NOW) ?? 0
    expect(recentGood).toBeGreaterThan(recentBad)
  })

  it('maps scores to bands and rolls up by unit size', () => {
    expect(bandFor(20)).toBe('needs_work')
    expect(bandFor(90)).toBe('strong')
    expect(weightedCompletion([{ completed: 1, total: 1 }, { completed: 0, total: 9 }])).toBe(10)
    expect(weightedCompletion([])).toBeNull()
  })
})
