import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { AIResponse } from '@/components/ai/AIResponse'

function renderMath(source: string, display: boolean): string | null {
  try {
    return katex.renderToString(source, {
      displayMode: display,
      throwOnError: true,
      trust: false,
      strict: 'ignore',
      maxExpand: 200,
      maxSize: 20,
    })
  } catch {
    return null
  }
}

function MathText({ text, animate }: { text: string; animate: boolean }) {
  const parts = useMemo(() => text.split(/(\$\$[^$]+\$\$|\$[^$\n]+\$)/g), [text])
  return (
    <>
      {parts.map((part, index) => {
        const display = part.startsWith('$$') && part.endsWith('$$') && part.length > 4
        const inline = !display && part.startsWith('$') && part.endsWith('$') && part.length > 2
        if (display || inline) {
          const body = display ? part.slice(2, -2) : part.slice(1, -1)
          const html = renderMath(body, display)
          if (html) {
            return (
              <span
                key={index}
                className={display ? 'ai-math ai-math--block' : 'ai-math'}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            )
          }
          return <code key={index}>{body}</code>
        }
        return animate ? <AIResponse key={index} text={part} /> : <span key={index}>{part}</span>
      })}
    </>
  )
}

export default function MessageBody({ content, animate = false }: { content: string; animate?: boolean }) {
  const blocks = content.split(/\n{2,}/)
  return (
    <>
      {blocks.map((block, index) => {
        const lines = block.split('\n')
        const isList = lines.every((line) => /^\s*([-*•]|\d+[.)])\s+/.test(line))
        if (isList) {
          return (
            <ul key={index} className="ai-list">
              {lines.map((line, position) => (
                <li key={position}><MathText animate={animate} text={line.replace(/^\s*([-*•]|\d+[.)])\s+/, '')} /></li>
              ))}
            </ul>
          )
        }
        const heading = /^#{1,4}\s+/.test(block)
        if (heading) return <h4 key={index}><MathText animate={animate} text={block.replace(/^#{1,4}\s+/, '')} /></h4>
        return <p key={index}><MathText animate={animate} text={block} /></p>
      })}
    </>
  )
}
