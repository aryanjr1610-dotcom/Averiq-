export type AIState = 'idle' | 'listening' | 'thinking' | 'streaming' | 'done' | 'error'

export type AIStateMotion = {
  intensity: number
  glow: number
  scale: number
  speed: number
  saturation: number
  hueRotate: number
  accent: 'success' | 'danger' | null
}

/**
 * One state vocabulary for the whole Averiq AI surface.
 * Components express these values in their own material rather than sharing
 * one literal animation overlay.
 */
export const AI_STATE_MOTION: Record<AIState, AIStateMotion> = {
  idle: { intensity: 0.28, glow: 0.16, scale: 0.96, speed: 0.62, saturation: 0.82, hueRotate: 0, accent: null },
  listening: { intensity: 0.72, glow: 0.5, scale: 1.03, speed: 1, saturation: 1.02, hueRotate: -6, accent: null },
  thinking: { intensity: 1, glow: 0.38, scale: 1, speed: 2.1, saturation: 1.06, hueRotate: 16, accent: null },
  streaming: { intensity: 0.62, glow: 0.44, scale: 1.01, speed: 1.35, saturation: 1, hueRotate: -10, accent: null },
  done: { intensity: 0.36, glow: 0.58, scale: 1.04, speed: 0.82, saturation: 1, hueRotate: 0, accent: 'success' },
  error: { intensity: 0.46, glow: 0.24, scale: 0.97, speed: 0.9, saturation: 0.48, hueRotate: 0, accent: 'danger' },
}

export const getAIStateMotion = (state: AIState | undefined): AIStateMotion =>
  AI_STATE_MOTION[state ?? 'idle'] ?? AI_STATE_MOTION.idle
