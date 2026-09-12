type Region = { slug: string; label: string; d: string }

const REGIONS: Region[] = [
  { slug: 'nervous', label: 'Nervous system', d: 'M60 12a16 16 0 1 1 0 32a16 16 0 0 1 0-32z' },
  { slug: 'respiratory', label: 'Respiratory system', d: 'M42 60h14v34H42zM64 60h14v34H64z' },
  { slug: 'circulatory', label: 'Circulatory system', d: 'M52 64c8-10 22-2 8 12c-14-14 0-22-8-12z' },
  { slug: 'digestive', label: 'Digestive system', d: 'M46 100h28v34H46z' },
  { slug: 'urinary', label: 'Excretory system', d: 'M40 108h8v14h-8zM72 108h8v14h-8z' },
  { slug: 'skeletal', label: 'Skeletal system', d: 'M58 46h4v100h-4z' },
  { slug: 'muscular', label: 'Muscular system', d: 'M30 60h10v60H30zM80 60h10v60H80z' },
]

export function BodyMap2D(props: { activeSlug?: string; onSelect: (slug: string) => void }) {
  return (
    <figure className="body-map">
      <svg viewBox="0 0 120 200" role="group" aria-label="Human body systems">
        <path className="body-map__silhouette" d="M60 8c9 0 15 7 15 16s-4 13-4 16c9 3 20 7 22 14l6 42-12 3-4-24v34l-6 60H43l-6-60V65l-4 24-12-3 6-42c2-7 13-11 22-14 0-3-4-7-4-16S51 8 60 8z" />
        {REGIONS.map((region) => (
          <path
            key={region.slug}
            d={region.d}
            role="button"
            tabIndex={0}
            aria-label={region.label}
            aria-pressed={props.activeSlug === region.slug}
            className={props.activeSlug === region.slug ? 'body-map__region body-map__region--on' : 'body-map__region'}
            onClick={() => props.onSelect(region.slug)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                props.onSelect(region.slug)
              }
            }}
          />
        ))}
      </svg>
      <figcaption>Schematic body map for navigation — not an anatomically scaled illustration.</figcaption>
    </figure>
  )
}
