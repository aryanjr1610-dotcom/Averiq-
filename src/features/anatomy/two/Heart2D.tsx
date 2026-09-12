import type { AnatomyStructure } from '../model'

const POSITIONS: Record<string, { x: number; y: number; w: number; h: number }> = {
  ra: { x: 24, y: 40, w: 58, h: 46 },
  rv: { x: 24, y: 92, w: 58, h: 66 },
  la: { x: 118, y: 40, w: 58, h: 46 },
  lv: { x: 118, y: 92, w: 58, h: 66 },
  tricuspid: { x: 34, y: 84, w: 38, h: 8 },
  mitral: { x: 128, y: 84, w: 38, h: 8 },
  vc: { x: 4, y: 14, w: 16, h: 24 },
  pa: { x: 74, y: 8, w: 22, h: 28 },
  pv: { x: 104, y: 8, w: 22, h: 28 },
  aorta: { x: 130, y: 6, w: 20, h: 30 },
}

export function Heart2D(props: {
  structures: AnatomyStructure[]
  selected?: string
  highlight: Set<string>
  labels: boolean
  onSelect: (objectKey: string) => void
}) {
  return (
    <svg className="heart-2d" viewBox="0 0 200 180" role="group" aria-label="Heart diagram">
      {props.structures.map((structure) => {
        const box = POSITIONS[structure.objectKey]
        if (!box) return null
        const on = props.selected === structure.objectKey || props.highlight.has(structure.objectKey)
        return (
          <g key={structure.slug}>
            <rect
              x={box.x}
              y={box.y}
              width={box.w}
              height={box.h}
              rx={8}
              role="button"
              tabIndex={0}
              aria-label={structure.name}
              aria-pressed={props.selected === structure.objectKey}
              className={on ? 'heart-2d__part heart-2d__part--on' : 'heart-2d__part'}
              onClick={() => props.onSelect(structure.objectKey)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  props.onSelect(structure.objectKey)
                }
              }}
            />
            {props.labels && structure.essential ? (
              <text x={box.x + 4} y={box.y + 16} className="heart-2d__label">{structure.name}</text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}
