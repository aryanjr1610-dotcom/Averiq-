import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ContentRenderer, DerivationView, RichTextView } from '@/features/learning/content/ContentRenderer';
import { MathText } from '@/features/learning/content/MathText';
import { EmptyState } from '@/components/system/States';
import type { ContentBlock } from '@/features/learning/content/schema';
import { formulaItems, revisionBlocks, richTextPlain, sourceHref, type FormulaBlock, type StudyItem, type StudyLesson } from './model';

export function FormulaBody({ block }: { block: FormulaBlock }) {
  const data = block.data;
  return <div className="study-formula-body">
    <MathText latex={data.latex} alternative={data.alternative} />
    {data.meaning.length > 0 && <p><RichTextView value={data.meaning} /></p>}
    {data.variables.length > 0 && <dl className="study-variables">{data.variables.map((variable, index) => <div key={index}><dt><MathText latex={variable.symbol} alternative={variable.symbol} inline /></dt><dd>{variable.meaning}{variable.unit && <span> · {variable.unit}</span>}</dd></div>)}</dl>}
    {data.siUnits && <p><strong>SI units:</strong> {data.siUnits}</p>}
    {data.dimensions && <p><strong>Dimensions:</strong> {data.dimensions}</p>}
    {data.conditions.length > 0 && <div><h4>When it applies</h4><ul>{data.conditions.map((condition, index) => <li key={index}>{condition}</li>)}</ul></div>}
  </div>;
}

function FormulaEntry({ item }: { item: StudyItem<FormulaBlock> }) {
  const derivation = item.document.blocks.find((block) => block.type === 'derivation' && block.id === item.block.data.derivationBlockId);
  const examples = item.document.blocks.filter((block) => block.type === 'workedExample' && block.requires?.includes(item.block.id));
  const visuals = item.document.blocks.filter((block) => block.type === 'visualizationReference');
  return <article className="study-formula" id={`formula-${item.lesson.id}-${item.block.id}`}>
    <div className="study-source"><span>{item.lesson.title}</span><Link to={sourceHref(item.lesson.id, item.block.id)}>Open in lesson</Link></div>
    <h3>{item.block.data.name || item.block.data.alternative}</h3>
    <FormulaBody block={item.block} />
    {derivation?.type === 'derivation' && <details className="study-detail"><summary>Derivation · {derivation.data.title}</summary><DerivationView data={derivation.data} /><Link to={sourceHref(item.lesson.id, derivation.id)}>Read derivation in context</Link></details>}
    {(item.block.requires?.length ?? 0) > 0 && <p className="study-hint">Read the source lesson for the prerequisite explanation.</p>}
    {!!item.block.data.relatedConcepts?.length && <nav className="study-related" aria-label={`Related to ${item.block.data.name || item.block.data.alternative}`}>{item.block.data.relatedConcepts.map((concept, index) => <Link key={index} to={sourceHref(concept.lessonId, concept.blockId)}>{concept.title}</Link>)}</nav>}
    {examples.length > 0 && <nav className="study-related" aria-label="Worked examples">{examples.map((block) => block.type === 'workedExample' && <Link key={block.id} to={sourceHref(item.lesson.id, block.id)}>Worked example: {block.data.title}</Link>)}</nav>}
    {visuals.length > 0 && <details className="study-detail"><summary>Visuals in this lesson</summary><nav className="study-related" aria-label="Lesson visuals">{visuals.map((block) => block.type === 'visualizationReference' && <Link key={block.id} to={sourceHref(item.lesson.id, block.id)}>{block.data.title}</Link>)}</nav></details>}
  </article>;
}

export function FormulaReference({ lessons }: { lessons: StudyLesson[] }) {
  const [query, setQuery] = useState('');
  const items = useMemo(() => formulaItems(lessons), [lessons]);
  const filtered = items.filter(({ block, lesson }) => `${block.data.name ?? ''} ${block.data.alternative} ${block.data.latex} ${richTextPlain(block.data.meaning)} ${block.data.variables.map((variable) => variable.meaning).join(' ')} ${lesson.title}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  if (!items.length) return <StudyEmpty kind="formulas" />;
  return <section className="study-reference" aria-label="Chapter formulas">
    <label className="study-search">Find a formula<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, symbol or meaning" /></label>
    <p className="study-hint" role="status">{filtered.length} of {items.length} {items.length === 1 ? 'formula' : 'formulas'}</p>
    {filtered.length ? filtered.map((item) => <FormulaEntry key={item.key} item={item} />) : <EmptyState heading="h3" title="No matching formulas" description="Try a symbol, a different name, or clear your search." action={<button className="button button--outline" onClick={() => setQuery('')}>Clear search</button>} />}
  </section>;
}

export function RevisionReference({ lessons, subjectCode, quick }: { lessons: StudyLesson[]; subjectCode: string; quick: boolean }) {
  const selected = lessons.map((item) => ({ ...item, blocks: revisionBlocks(item.document, quick) })).filter((item) => item.blocks.length);
  if (!selected.length) return <StudyEmpty kind={quick ? 'quick revision notes' : 'revision notes'} />;
  return <div className={`study-revision${quick ? ' study-revision--quick' : ''}`}>
    {selected.map(({ lesson, document, blocks }) => <section className="study-revision-section" key={lesson.id}>
      <div className="study-section-heading"><h3>{lesson.title}</h3><Link to={sourceHref(lesson.id)}>Read full lesson</Link></div>
      {quick ? <><QuickPoints blocks={blocks} /><details className="study-detail"><summary>Context, symbols and derivations</summary><ContentRenderer document={{ schemaVersion: document.schemaVersion, blocks }} lessonId={lesson.id} subjectCode={subjectCode} headingOffset={2} /></details></> : <ContentRenderer document={{ schemaVersion: document.schemaVersion, blocks }} lessonId={lesson.id} subjectCode={subjectCode} headingOffset={2} />}
    </section>)}
  </div>;
}

function QuickPoints({ blocks }: { blocks: ContentBlock[] }) {
  return <div className="study-quick-points">{blocks.map((block) => {
    if (block.type === 'summary' || block.type === 'commonMistake') return <div key={block.id}><h4>{block.data.title}</h4><p><RichTextView value={block.data.content} /></p></div>;
    if (block.type === 'formula' || block.type === 'equation') return <div key={block.id}><h4>{block.data.name || block.data.alternative}</h4><MathText latex={block.data.latex} alternative={block.data.alternative} />{block.data.meaning.length > 0 && <p><RichTextView value={block.data.meaning} /></p>}</div>;
    return null;
  })}</div>;
}

export function StudyEmpty({ kind }: { kind: string }) {
  return <EmptyState heading="h3" title={`No ${kind} in this chapter yet`} description="Choose another chapter above, or continue with the full lesson." action={<Link className="button button--outline" to="/app/learn">Open learning library</Link>} />;
}
