import { createElement, useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import type { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Radio } from '@/components/ui/Input';

import { useAuth } from '@/features/auth/AuthProvider';
import { curriculumRepository } from '@/features/curriculum/repository';

import {
  BlockSchema,
  DocumentEnvelope,
  GenericBlockSchema,
  SubjectBlockSchema,
  blockSchemas,
} from './schema';

import type {
  ContentBlock,
  GenericBlock,
  RichText,
} from './schema';

import { MathText } from './MathText';
import {
  BlockReadingContext,
  blockAnchor,
  selectReadingBlocks,
  useBlockReading,
} from '../reading';
import type { ReadingMode } from '../reading';
import { subjectLearningConfig, supportsExtension } from '../subjects/config';
import { SubjectBlocks } from '../subjects/SubjectBlocks';
import { Visualization } from '@/features/visuals/Visualization';

export function RichTextView({ value }: { value: RichText }) {
  return (
    <>
      {value.map((item, index) => {
        if (item.type === 'math') {
          return (
            <MathText
              key={index}
              latex={item.latex}
              alternative={item.alternative}
              inline
            />
          );
        }

        if (item.type === 'link') {
          const external = item.href.startsWith('https://');

          return (
            <a
              key={index}
              href={item.href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
            >
              {item.text}
            </a>
          );
        }

        let content: ReactNode = item.text;

        for (const mark of item.marks) {
          if (mark === 'strong') content = <strong>{content}</strong>;
          if (mark === 'emphasis') content = <em>{content}</em>;
          if (mark === 'code') content = <code>{content}</code>;
          if (mark === 'subscript') content = <sub>{content}</sub>;
          if (mark === 'superscript') content = <sup>{content}</sup>;
        }

        return <span key={index}>{content}</span>;
      })}
    </>
  );
}

function AssetImage({
  assetId,
  alt,
  caption,
}: {
  assetId: string;
  alt: string;
  caption?: string;
}) {
  const { user } = useAuth();

  const [asset, setAsset] = useState<{
    url: string;
    credit: string;
    license_reference: string;
  } | null>(null);

  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setAsset(null);
    setFailed(false);

    void curriculumRepository.getAsset(assetId)
      .then((value) => {
        if (active) setAsset(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [assetId, user?.id]);

  if (failed) {
    return <p className="content-unavailable">This image is unavailable.</p>;
  }

  if (!asset) {
    return <div className="skeleton skeleton--panel" aria-label="Loading image" />;
  }

  return (
    <figure className="lesson-figure">
      <img
        src={asset.url}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />

      <figcaption>
        {caption && <p>{caption}</p>}
        <p>{asset.credit}</p>
        <p className="type-caption">{asset.license_reference}</p>
      </figcaption>
    </figure>
  );
}

type MathData = z.infer<typeof blockSchemas.formula>['data'];
type Steps = z.infer<typeof blockSchemas.stepByStep>['data']['steps'];

function FormulaView({ data }: { data: MathData }) {
  const reading = useBlockReading();
  const [notice, setNotice] = useState('');

  async function copyFormula() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable.');
      await navigator.clipboard.writeText(data.latex);
      setNotice('Formula copied as LaTeX.');
    } catch {
      setNotice('Copy is unavailable. You can select the equation text instead.');
    }
  }

  return (
    <figure className="lesson-formula">
      {data.name && <figcaption className="type-card">{data.name}</figcaption>}

      <MathText latex={data.latex} alternative={data.alternative} />

      {data.meaning.length > 0 && <p><RichTextView value={data.meaning} /></p>}

      <details open={reading.mode === 'learn'}>
        <summary>Explain symbols, units and conditions</summary>

        <dl className="symbol-list">
          {data.variables.map((variable) => (
            <div key={variable.symbol}>
              <dt>{variable.symbol}</dt>
              <dd>{variable.meaning}{variable.unit && ` · ${variable.unit}`}</dd>
            </div>
          ))}
        </dl>

        {data.siUnits && <p>SI unit: {data.siUnits}</p>}
        {data.dimensions && <p>Dimensions: {data.dimensions}</p>}
        <ul>{data.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul>
      </details>

      <div className="actions">
        <Button variant="quiet" onClick={() => void copyFormula()}>Copy LaTeX</Button>

        {data.derivationBlockId && (
          <a href={`#${blockAnchor(reading.lessonId, data.derivationBlockId)}`}>
            Go to derivation
          </a>
        )}

        {data.relatedConcepts?.map((concept) => (
          <a
            key={`${concept.lessonId}:${concept.blockId ?? ''}`}
            href={`/app/learn/lessons/${concept.lessonId}${concept.blockId ? `#${blockAnchor(concept.lessonId, concept.blockId)}` : ''}`}
          >
            {concept.title}
          </a>
        ))}
      </div>

      {notice && <p role="status" className="type-caption">{notice}</p>}
    </figure>
  );
}

function StepList({ steps }: { steps: Steps }) {
  return (
    <ol className="solution-steps">
      {steps.map((step) => (
        <li key={step.id}>
          {step.title && <strong>{step.title}</strong>}

          {step.latex && (
            <MathText
              latex={step.latex}
              alternative={`Equation for ${step.title ?? 'this step'}`}
            />
          )}

          <p><RichTextView value={step.reason} /></p>
          {step.note && <p className="type-caption">{step.note}</p>}
        </li>
      ))}
    </ol>
  );
}

function Checkpoint({
  data,
}: {
  data: z.infer<typeof blockSchemas.checkpoint>['data'];
}) {
  const name = useId();
  const [selected, setSelected] = useState('');
  const [checked, setChecked] = useState(false);

  return (
    <section className="lesson-callout">
      <fieldset className="checkpoint-options">
        <legend className="type-card">{data.question}</legend>

        {data.options.map((option) => (
          <Radio
            key={option.id}
            name={name}
            label={option.label}
            value={option.id}
            checked={selected === option.id}
            onChange={() => {
              setSelected(option.id);
              setChecked(false);
            }}
          />
        ))}
      </fieldset>

      <Button
        variant="secondary"
        disabled={!selected}
        onClick={() => setChecked(true)}
      >
        Check understanding
      </Button>

      {checked && (
        <div role="status">
          <strong>
            {selected === data.correctOptionId
              ? 'That is correct.'
              : 'Not quite. Consider this explanation.'}
          </strong>

          <p><RichTextView value={data.explanation} /></p>
        </div>
      )}

      <p className="type-caption">
        This is a learning check, not a saved score or mastery assessment.
      </p>
    </section>
  );
}

export function DerivationView({
  data,
}: {
  data: z.infer<typeof blockSchemas.derivation>['data'];
}) {
  const { mode } = useBlockReading();
  const [expanded, setExpanded] = useState(mode === 'learn');
  const detailsId = useId();

  useEffect(() => setExpanded(mode === 'learn'), [mode]);

  return (
    <section className="book-derivation">
      <strong>{data.title}</strong>

      {data.startingConditions && (
        <p><RichTextView value={data.startingConditions} /></p>
      )}

      <Button variant="quiet" aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded((value) => !value)}>
        {expanded ? 'Collapse derivation' : 'Expand full derivation'}
      </Button>

      {expanded && (
        <div id={detailsId}>
          <StepList steps={data.steps} />

          {data.result && <MathText latex={data.result} alternative="Final derived relation" />}

          {data.interpretation && (
            <p><RichTextView value={data.interpretation} /></p>
          )}

          {data.assumptions?.length ? (
            <ul>{data.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
          ) : null}

          {data.examNote && <p className="type-caption">{data.examNote}</p>}
        </div>
      )}
    </section>
  );
}

type Renderer = (block: GenericBlock) => ReactNode;

const renderers: Record<GenericBlock['type'], Renderer> = {
  heading: (block) => {
    if (block.type !== 'heading') return null;

    const Heading = `h${block.data.level}` as 'h2' | 'h3' | 'h4';
    return <Heading>{block.data.text}</Heading>;
  },

  paragraph: (block) =>
    block.type === 'paragraph'
      ? <p><RichTextView value={block.data.content} /></p>
      : null,

  richText: (block) =>
    block.type === 'richText'
      ? <p><RichTextView value={block.data.content} /></p>
      : null,

  definition: noteRenderer,
  keyConcept: noteRenderer,
  callout: noteRenderer,
  important: noteRenderer,
  commonMistake: noteRenderer,
  summary: noteRenderer,
  examTip: noteRenderer,

  equation: (block) =>
    block.type === 'equation' ? <FormulaView data={block.data} /> : null,

  formula: (block) =>
    block.type === 'formula' ? <FormulaView data={block.data} /> : null,

  list: (block) => {
    if (block.type !== 'list') return null;
    const List = block.data.ordered ? 'ol' : 'ul';

    return (
      <List>
        {block.data.items.map((item, index) => (
          <li key={index}><RichTextView value={item} /></li>
        ))}
      </List>
    );
  },

  table: (block) => {
    if (block.type !== 'table') return null;

    return (
      <div className="lesson-table-scroll" tabIndex={0} role="region" aria-label={block.data.caption}>
        <table className="lesson-table">
          <caption>{block.data.caption}</caption>
          <thead>
            <tr>
              {block.data.headers.map((header, index) => (
                <th scope="col" key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.data.rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}><RichTextView value={cell} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },

  derivation: (block) =>
    block.type === 'derivation'
      ? <DerivationView data={block.data} />
      : null,

  stepByStep: (block) =>
    block.type === 'stepByStep'
      ? (
        <section>
          <strong>{block.data.title}</strong>
          <StepList steps={block.data.steps} />
        </section>
      )
      : null,

  workedExample: (block) => {
    if (block.type !== 'workedExample') return null;
    const data = block.data;

    return (
      <section className="worked-example">
        <strong className="type-card">{data.title}</strong>
        <p><RichTextView value={data.problem} /></p>

        <dl className="symbol-list">
          {data.given.map((item) => (
            <div key={item.symbol}>
              <dt>{item.symbol}</dt>
              <dd>{item.value} {item.unit}</dd>
            </div>
          ))}
        </dl>

        <p><strong>Find:</strong> {data.find}</p>
        <p><RichTextView value={data.concept} /></p>

        <StepList steps={data.steps} />

        <MathText
          latex={data.answer.latex}
          alternative={data.answer.alternative}
        />

        {data.answer.unit && <p>Unit: {data.answer.unit}</p>}
        {data.examNote && <p className="type-caption">{data.examNote}</p>}
      </section>
    );
  },

  image: (block) =>
    block.type === 'image'
      ? <AssetImage assetId={block.data.assetId} alt={block.data.alt} caption={block.data.caption} />
      : null,

  diagram2d: (block) => {
    if (block.type !== 'diagram2d') return null;

    return (
      <section className="visual-reference">
        <strong>{block.data.title}</strong>
        <p>{block.data.caption}</p>

        {block.data.fallbackAssetId && (
          <AssetImage
            assetId={block.data.fallbackAssetId}
            alt={block.data.caption}
          />
        )}

        {block.data.labels.length > 0 && (
          <p className="type-caption">
            Labels: {block.data.labels.join(' · ')}
          </p>
        )}

        <Visualization id={block.data.diagramId} />
      </section>
    );
  },

  visualizationReference: (block) => {
    if (block.type !== 'visualizationReference') return null;

    return (
      <section className="visual-reference">
        <strong>{block.data.title}</strong>
        <p>{block.data.description}</p>

        {block.data.fallbackAssetId && (
          <AssetImage
            assetId={block.data.fallbackAssetId}
            alt={block.data.description}
          />
        )}

        <Visualization id={block.data.resourceId} />
      </section>
    );
  },

  timeline: (block) =>
    block.type === 'timeline'
      ? (
        <section>
          <strong>{block.data.title}</strong>
          <ol className="lesson-timeline">
            {block.data.events.map((event, index) => (
              <li key={index}>
                <span className="type-caption">{event.label}</span>
                <strong>{event.title}</strong>
                <p><RichTextView value={event.explanation} /></p>
              </li>
            ))}
          </ol>
        </section>
      )
      : null,

  comparison: (block) =>
    block.type === 'comparison'
      ? (
        <section className="lesson-comparison">
          <strong>{block.data.title}</strong>

          <div>
            {block.data.columns.map((column) => (
              <section key={column.title}>
                <strong>{column.title}</strong>
                <ul>
                  {column.points.map((point, index) => (
                    <li key={index}><RichTextView value={point} /></li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      )
      : null,

  quoteReference: (block) => {
    if (block.type !== 'quoteReference') return null;
    const data = block.data;

    return (
      <section className="literature-reference">
        <p className="type-caption">
          {data.workTitle} · {data.sectionReference}
        </p>

        {data.excerpt && (
          <blockquote className="literature-excerpt">
            {data.excerpt}
          </blockquote>
        )}

        <p><RichTextView value={data.explanation} /></p>

        {data.vocabulary.length > 0 && (
          <dl className="symbol-list">
            {data.vocabulary.map((item) => (
              <div key={item.word}>
                <dt>{item.word}</dt>
                <dd>{item.meaning}</dd>
              </div>
            ))}
          </dl>
        )}

        {data.themes.length > 0 && <p>Themes: {data.themes.join(', ')}</p>}
        {data.literaryDevices.length > 0 && (
          <p>Devices: {data.literaryDevices.join(', ')}</p>
        )}

        <p className="type-caption">{data.credit}</p>
      </section>
    );
  },

  checkpoint: (block) =>
    block.type === 'checkpoint' ? <Checkpoint data={block.data} /> : null,
};

function noteRenderer(block: GenericBlock) {
  if (
    block.type !== 'definition' &&
    block.type !== 'keyConcept' &&
    block.type !== 'callout' &&
    block.type !== 'important' &&
    block.type !== 'commonMistake' &&
    block.type !== 'summary' &&
    block.type !== 'examTip'
  ) {
    return null;
  }

  return (
    <aside className={`lesson-callout lesson-callout--${block.type}`}>
      <strong>{block.data.title}</strong>
      <p><RichTextView value={block.data.content} /></p>

      {block.type === 'examTip' && block.data.contexts.length > 0 && (
        <p className="type-caption">{block.data.contexts.join(' · ')}</p>
      )}
    </aside>
  );
}

export function contentHeadings(input: unknown) {
  const envelope = DocumentEnvelope.safeParse(input);
  if (!envelope.success) return [];

  return envelope.data.blocks.flatMap((raw) => {
    const parsed = blockSchemas.heading.safeParse(raw);

    return parsed.success
      ? [{ id: parsed.data.id, ...parsed.data.data }]
      : [];
  });
}

export function ContentRenderer({
  document,
  lessonId,
  subjectCode,
  mode = 'learn',
  headingOffset = 0,
}: {
  document: unknown;
  lessonId: string;
  subjectCode: string;
  mode?: ReadingMode;
  headingOffset?: number;
}) {
  const envelope = DocumentEnvelope.safeParse(document);

  if (!envelope.success) {
    return <p className="content-unavailable" role="alert">Unsupported content document.</p>;
  }

  const valid: ContentBlock[] = [];
  const invalid: number[] = [];
  const seen = new Set<string>();

  envelope.data.blocks.forEach((raw, index) => {
    const result = BlockSchema.safeParse(raw);

    if (!result.success || seen.has(result.data.id)) {
      invalid.push(index);

      if (import.meta.env.DEV && !result.success) {
        console.warn('Invalid learning block', {
          lessonId,
          index,
          issues: result.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        });
      }

      return;
    }

    seen.add(result.data.id);
    valid.push(result.data);
  });

  const selected = selectReadingBlocks(valid, mode);
  const config = subjectLearningConfig(subjectCode);

  const tools = config.tools.flatMap((tool) => {
    const target = selected.blocks.find((block) => tool.types.includes(block.type));
    return target ? [{ label: tool.label, id: target.id }] : [];
  });

  return (
    <div className="lesson-document">
      {tools.length > 0 && (
        <nav className="subject-tools" aria-label="Tools in this section">
          {tools.map((tool) => (
            <a key={tool.label} href={`#${blockAnchor(lessonId, tool.id)}`}>{tool.label}</a>
          ))}
        </nav>
      )}

      {selected.fallback && (
        <p className="type-caption">
          This section has insufficient mode metadata, so its full explanation is shown.
        </p>
      )}

      {selected.blocks.map((block) => {
        const context = { lessonId, blockId: block.id, mode };
        const generic = GenericBlockSchema.safeParse(block);
        const specialized = SubjectBlockSchema.safeParse(block);

        let body: ReactNode;

        if (!supportsExtension(subjectCode, block.type)) {
          body = <p className="content-unavailable">This subject extension is unavailable.</p>;
        } else if (block.type === 'heading') {
          body = createElement(
            `h${Math.min(6, block.data.level + headingOffset)}`,
            undefined,
            block.data.text,
          );
        } else if (generic.success) {
          body = renderers[generic.data.type](generic.data);
        } else if (specialized.success) {
          body = (
            <SubjectBlocks
              block={specialized.data}
              rich={(value) => <RichTextView value={value} />}
              shared={(type, data) => {
                const value = GenericBlockSchema.parse({
                  id: block.id,
                  type,
                  data,
                });

                return renderers[value.type](value);
              }}
            />
          );
        } else {
          body = <p className="content-unavailable">This block cannot be displayed.</p>;
        }

        return (
          <BlockReadingContext.Provider value={context} key={block.id}>
            <div
              id={blockAnchor(lessonId, block.id)}
              data-lesson-id={lessonId}
              data-block-id={block.id}
              className={`lesson-block lesson-block--${block.type}`}
            >
              {body}
            </div>
          </BlockReadingContext.Provider>
        );
      })}

      {invalid.map((index) => (
        <p key={index} className="content-unavailable">
          A malformed block was omitted. The remaining explanation is still available.
        </p>
      ))}
    </div>
  );
}
