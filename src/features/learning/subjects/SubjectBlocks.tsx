import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { MathText } from '../content/MathText';
import type { GenericBlock, RichText, SubjectBlock } from '../content/schema';

import { Visualization } from '@/features/visuals/Visualization';

export function SubjectBlocks({
  block,
  rich,
  shared,
}: {
  block: SubjectBlock;
  rich: (value: RichText) => ReactNode;
  shared: (type: GenericBlock['type'], data: unknown) => ReactNode;
}) {
  switch (block.type) {
    case 'quantity':
      return (
        <section className="quantity-entry">
          <strong>{block.data.name}</strong>
          <MathText latex={block.data.symbol} alternative={block.data.name} inline />
          <p>{rich(block.data.meaning)}</p>
          <dl className="symbol-list">
            <div><dt>Type</dt><dd>{block.data.quantityType}</dd></div>
            <div><dt>SI unit</dt><dd>{block.data.siUnit}</dd></div>
            {block.data.dimensions && <div><dt>Dimensions</dt><dd>{block.data.dimensions}</dd></div>}
          </dl>
          {block.data.conditions?.map((condition) => <p key={condition}>{condition}</p>)}
        </section>
      );

    case 'proof':
      return (
        <section className="book-proof">
          <strong>{block.data.title}</strong>
          <p>{rich(block.data.statement)}</p>
          <p><strong>Given: </strong>{rich(block.data.given)}</p>
          <p><strong>To prove: </strong>{rich(block.data.toProve)}</p>
          {block.data.assumptions && <p>{rich(block.data.assumptions)}</p>}

          {shared('stepByStep', {
            title: 'Proof',
            steps: block.data.steps,
          })}

          <p><strong>Conclusion: </strong>{rich(block.data.conclusion)}</p>
        </section>
      );

    case 'graphReference':
      return (
        <section>
          <MathText latex={block.data.equation} alternative="Function being discussed" />
          <p>{block.data.caption}</p>
          <p className="type-caption">
            Authored reference window: x {block.data.xRange.join(' to ')},
            {' '}y {block.data.yRange.join(' to ')}.
            The interactive module has its own bounded view controls.
          </p>
          <Visualization id={block.data.visualizationId} initial={block.data.parameters} />
        </section>
      );

    case 'reaction': {
      const species = (items: typeof block.data.reactants) => items.map((item) =>
        `${item.coefficient === 1 ? '' : `${item.coefficient} `}${item.formula}${item.state ? `(${item.state})` : ''}`,
      ).join(' + ');

      return (
        <section className="book-reaction">
          <strong>{block.data.title}</strong>
          <p className="reaction-equation">
            {species(block.data.reactants)}
            {' '}{block.data.reversible ? '⇌' : '→'}{' '}
            {species(block.data.products)}
          </p>
          <p>{rich(block.data.explanation)}</p>
          <p>Reaction type: {block.data.reactionType}</p>
          {block.data.catalyst && <p>Catalyst: {block.data.catalyst}</p>}
          {block.data.temperature && <p>Temperature: {block.data.temperature}</p>}
          <ul>{block.data.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul>
        </section>
      );
    }

    case 'experiment':
      return (
        <section className="book-experiment">
          <strong>{block.data.title}</strong>
          <p><strong>Aim: </strong>{rich(block.data.aim)}</p>
          <p>{rich(block.data.concept)}</p>
          <p>Materials: {block.data.materials.join(', ')}</p>
          <ol>{block.data.procedureSummary.map((item, index) => <li key={index}>{rich(item)}</li>)}</ol>
          <p><strong>Observation: </strong>{rich(block.data.observation)}</p>
          <p><strong>Result: </strong>{rich(block.data.result)}</p>
          <aside className="lesson-callout">{block.data.safetyNote}</aside>
        </section>
      );

    case 'biologicalProcess':
      return (
        <section>
          <strong>{block.data.title}</strong>
          <ol className="biological-stages">
            {block.data.stages.map((stage) => (
              <li key={stage.id}>
                <strong>{stage.title}</strong>
                <p>{rich(stage.description)}</p>
                {stage.visualRef && <Visualization id={stage.visualRef} />}
              </li>
            ))}
          </ol>
        </section>
      );

    case 'structureFunction':
      return (
        <section>
          <strong>{block.data.structure}</strong>
          <p><strong>Location: </strong>{rich(block.data.location)}</p>
          <p>{rich(block.data.characteristics)}</p>
          <p><strong>Function: </strong>{rich(block.data.function)}</p>
          {block.data.relatedSystem && <p>Related system: {block.data.relatedSystem}</p>}
          {block.data.anatomy ? (
            <Link className="exam-link" to={`/app/anatomy/${block.data.anatomy.systemSlug}/${block.data.anatomy.organSlug}`}>
              Explore in Anatomy
            </Link>
          ) : null}
        </section>
      );

    case 'literaryDevice':
      return (
        <section className="literary-analysis">
          <strong>{block.data.device}</strong>
          <p className="type-caption">{block.data.sectionReference}</p>
          <p>{rich(block.data.effect)}</p>
          <p>{rich(block.data.interpretation)}</p>
        </section>
      );

    case 'vocabulary':
      return (
        <dl className="book-vocabulary">
          {block.data.entries.map((entry) => (
            <div key={entry.word}>
              <dt>{entry.word}</dt>
              <dd>
                <p>{rich(entry.meaning)}</p>
                <p>{rich(entry.context)}</p>
                <p>{rich(entry.simpleExplanation)}</p>
              </dd>
            </div>
          ))}
        </dl>
      );

    case 'examAnswerGuidance':
      return (
        <section>
          <strong>{block.data.questionType}</strong>
          <p>{rich(block.data.expectedReasoning)}</p>
          <ul>{block.data.keyPoints.map((item, index) => <li key={index}>{rich(item)}</li>)}</ul>
          <ol>{block.data.suggestedStructure.map((item, index) => <li key={index}>{rich(item)}</li>)}</ol>
          <p>{rich(block.data.commonMistake)}</p>
          <p className="type-caption">Original answer guidance—not an official marking scheme.</p>
        </section>
      );
  }
}
