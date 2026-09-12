import katex from 'katex';

import { DocumentSchema } from './schema';
import type { LearningDocument } from './schema';
import { supportsExtension } from '../subjects/config';

export function validateLearningDocument(
  input: unknown,
  subjectCode?: string,
): LearningDocument {
  const document = DocumentSchema.parse(input);

  if (subjectCode) {
    for (const item of document.blocks) {
      if (!supportsExtension(subjectCode, item.type)) {
        throw new Error(
          `Block "${item.type}" is not enabled for subject "${subjectCode}".`,
        );
      }
    }
  }

  function walk(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }

    if (!value || typeof value !== 'object') return;

    for (const [key, child] of Object.entries(value)) {
      if (
        (key === 'latex' || key === 'result') &&
        typeof child === 'string'
      ) {
        katex.renderToString(child, {
          throwOnError: true,
          trust: false,
          strict: 'error',
          maxExpand: 200,
          maxSize: 20,
          output: 'htmlAndMathml',
        });
      } else {
        walk(child);
      }
    }
  }

  walk(document);
  return document;
}
