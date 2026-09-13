import { Fragment, useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export type AIResponseCitation = {
  id: string
  index: number
  title: string
  url?: string
}

export type AIResponseProps = {
  text: string
  citations?: AIResponseCitation[]
  isStreaming?: boolean
  className?: string
}

type Token = { value: string; citation?: AIResponseCitation }

const TOKEN_SPLIT = /(\s+|\[\d+\])/g
const CITATION_MARKER = /^\[(\d+)\]$/
const HAS_WORD = /[\p{L}\p{N}]/u
const WHITESPACE = /^\s+$/

function tokenize(text: string, citations: AIResponseCitation[]): Token[] {
  return text.split(TOKEN_SPLIT).filter(Boolean).map((value) => {
    const match = value.match(CITATION_MARKER)
    if (!match) return { value }
    const index = Number(match[1])
    const citation = citations.find((entry) => entry.index === index)
    return citation ? { value, citation } : { value }
  })
}

/**
 * Streaming-friendly response text. Existing words stay still; only tokens that
 * are new since the previous render receive the subtle unblur entrance.
 */
export function AIResponse({ text, citations = [], isStreaming = false, className = '' }: AIResponseProps) {
  const reduceMotion = useReducedMotion()
  const tokens = tokenize(text, citations)
  const paintedRef = useRef(0)
  const firstNewIndex = paintedRef.current

  useEffect(() => {
    paintedRef.current = tokens.length
  }, [tokens.length])

  return (
    <span className={`ai-response ${className}`.trim()}>
      {tokens.map((token, index) => {
        const isNew = index >= firstNewIndex
        const key = index

        if (WHITESPACE.test(token.value) || !(token.citation || HAS_WORD.test(token.value))) {
          return <Fragment key={key}>{token.value}</Fragment>
        }

        if (token.citation) {
          const common = {
            title: token.citation.title,
            className: 'ai-response__citation',
            children: token.citation.index,
          }
          return token.citation.url ? (
            <motion.a
              {...common}
              key={key}
              href={token.citation.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={isNew && !reduceMotion ? { opacity: 0, scale: 0.7 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', duration: 0.25, bounce: 0.1 }}
            />
          ) : (
            <motion.span
              {...common}
              key={key}
              initial={isNew && !reduceMotion ? { opacity: 0, scale: 0.7 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', duration: 0.25, bounce: 0.1 }}
            />
          )
        }

        return (
          <motion.span
            key={key}
            className="ai-response__word"
            initial={isNew && !reduceMotion ? { opacity: 0, y: 2, filter: 'blur(4px)' } : false}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            {token.value}
          </motion.span>
        )
      })}
      {isStreaming ? (
        <motion.span
          aria-hidden="true"
          className="ai-response__caret"
          animate={reduceMotion ? { opacity: 1 } : { opacity: [1, 0.15, 1] }}
          transition={reduceMotion ? { duration: 0 } : { duration: 1, ease: 'linear', repeat: Number.POSITIVE_INFINITY }}
        />
      ) : null}
    </span>
  )
}

export default AIResponse
