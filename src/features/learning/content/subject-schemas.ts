import { z } from 'zod';

import { block, Id, Latex, Text } from './block-base';

import type { RichTextSchema, Step } from './schema';

const Range = z.tuple([
  z.number().finite().min(-1000).max(1000),
  z.number().finite().min(-1000).max(1000),
]).refine(([minimum, maximum]) => maximum > minimum, 'Invalid axis range.');

export function createSubjectSchemas(
  rich: typeof RichTextSchema,
  step: typeof Step,
) {
  return {
    quantity: block('quantity', z.object({
      name: Text,
      symbol: Latex,
      quantityType: z.enum(['scalar', 'vector']),
      meaning: rich,
      siUnit: Text,
      dimensions: z.string().max(200).optional(),
      conditions: z.array(Text).max(20).optional(),
    })),

    proof: block('proof', z.object({
      title: Text,
      statement: rich,
      given: rich,
      toProve: rich,
      assumptions: rich.optional(),
      steps: z.array(step).min(1).max(50),
      conclusion: rich,
    })),

    graphReference: block('graphReference', z.object({
      visualizationId: Id,
      equation: Latex,
      xRange: Range,
      yRange: Range,
      parameters: z.record(z.string(), z.number().finite()).optional(),
      caption: Text,
    })),

    reaction: block('reaction', z.object({
      title: Text,
      reactants: z.array(z.object({
        formula: z.string().min(1).max(100),
        coefficient: z.number().int().positive().max(1000).default(1),
        state: z.enum(['s', 'l', 'g', 'aq']).optional(),
      })).min(1).max(15),

      products: z.array(z.object({
        formula: z.string().min(1).max(100),
        coefficient: z.number().int().positive().max(1000).default(1),
        state: z.enum(['s', 'l', 'g', 'aq']).optional(),
      })).min(1).max(15),

      reversible: z.boolean().default(false),
      reactionType: Text,
      conditions: z.array(Text).max(15),
      catalyst: Text.optional(),
      temperature: Text.optional(),
      explanation: rich,
    })),

    experiment: block('experiment', z.object({
      title: Text,
      aim: rich,
      concept: rich,
      materials: z.array(Text).max(30),
      procedureSummary: z.array(rich).max(20),
      observation: rich,
      result: rich,
      safetyNote: Text,
    })),

    biologicalProcess: block('biologicalProcess', z.object({
      title: Text,
      stages: z.array(z.object({
        id: Id,
        title: Text,
        description: rich,
        visualRef: Id.optional(),
      })).min(1).max(30),
    })),

    structureFunction: block('structureFunction', z.object({
      structure: Text,
      location: rich,
      characteristics: rich,
      function: rich,
      relatedSystem: Text.optional(),
      anatomy: z.object({ systemSlug: z.string().min(1).max(60), organSlug: z.string().min(1).max(60) }).optional(),
    })),

    literaryDevice: block('literaryDevice', z.object({
      device: Text,
      sectionReference: Text,
      effect: rich,
      interpretation: rich,
    })),

    vocabulary: block('vocabulary', z.object({
      entries: z.array(z.object({
        word: Text,
        meaning: rich,
        context: rich,
        simpleExplanation: rich,
      })).min(1).max(40),
    })),

    examAnswerGuidance: block('examAnswerGuidance', z.object({
      questionType: Text,
      expectedReasoning: rich,
      keyPoints: z.array(rich).max(20),
      suggestedStructure: z.array(rich).max(15),
      commonMistake: rich,
      basis: z.literal('original-guidance'),
    })),
  };
}
