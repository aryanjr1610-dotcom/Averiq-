type ContentBlock = {
  id?: string
  block_key: string
  block_type: string
  position: number
  depth_level: 'foundation' | 'board' | 'advanced'
  heading?: string | null
  body: string
  visual_slot_key?: string | null
}

type KeyTerm = {
  id?: string
  term: string
  definition: string
  position: number
}

type Example = {
  id?: string
  title?: string | null
  problem_statement: string
  approach?: string | null
  solution: string
  final_answer?: string | null
  explanation?: string | null
  difficulty: string
}

type Exercise = {
  id?: string
  question_text: string
  question_type: string
  options?: unknown
  answer?: unknown
  solution?: string | null
  explanation?: string | null
  difficulty: string
  marks?: number | null
}

interface Props {
  blocks?: ContentBlock[]
  keyTerms?: KeyTerm[]
  examples?: Example[]
  exercises?: Exercise[]
}

export function LessonContentRenderer({
  blocks = [],
  keyTerms = [],
  examples = [],
  exercises = [],
}: Props) {
  const orderedBlocks = [...blocks].sort((a, b) => a.position - b.position)

  return (
    <article className="lesson-content">
      {orderedBlocks.map(block => (
        <section
          key={block.id ?? block.block_key}
          data-block-type={block.block_type}
          data-depth={block.depth_level}
        >
          {block.heading && <h2>{block.heading}</h2>}
          <div
            className="lesson-body"
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {block.body}
          </div>
          {/* VISUAL PHASE LATER
              block.visual_slot_key will connect here to:
              - diagrams
              - maps
              - graphs
              - animations
              - interactive models
              - 2D/3D assets
              Do not hardcode visuals now.
           */}
        </section>
      ))}

      {keyTerms.length > 0 && (
        <section>
          <h2>Key Terms</h2>
          <dl>
            {keyTerms.map(term => (
              <div key={term.id ?? term.term}>
                <dt>
                  <strong>{term.term}</strong>
                </dt>
                <dd>{term.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {examples.length > 0 && (
        <section>
          <h2>Worked Examples</h2>
          {examples.map((example, index) => (
            <div key={example.id ?? index}>
              <h3>{example.title ?? `Example ${index + 1}`}</h3>
              <p>
                <strong>Problem:</strong> {example.problem_statement}
              </p>
              {example.approach && (
                <p>
                  <strong>Approach:</strong> {example.approach}
                </p>
              )}
              <p>
                <strong>Solution:</strong> {example.solution}
              </p>
              {example.final_answer && (
                <p>
                  <strong>Final answer:</strong> {example.final_answer}
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      {exercises.length > 0 && (
        <section>
          <h2>Practice</h2>
          {exercises.map((question, index) => (
            <div key={question.id ?? index}>
              <h3>Question {index + 1}</h3>
              <p>{question.question_text}</p>
              {question.marks != null && (
                <small>{question.marks} marks</small>
              )}
              {question.solution && (
                <details>
                  <summary>Show solution</summary>
                  <p>{question.solution}</p>
                  {question.explanation && <p>{question.explanation}</p>}
                </details>
              )}
            </div>
          ))}
        </section>
      )}
    </article>
  )
}
