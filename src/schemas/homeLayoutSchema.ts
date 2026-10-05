import { z } from 'zod';

import { HomeCard } from '../ui/organisms/home/HomeCard';
import { NextStepCard } from '../ui/molecules/home/NextStepCard';

import { PracticeCard } from '../ui/organisms/practice/PracticeCard';
import { RevisitSection } from '../ui/organisms/practice/RevisitSection';

// 1. Reusable Atoms
const IconEnum = z.enum(['zap', 'book', 'clock', 'star', 'chevron-right']);

// 2. Component Schemas
const HomeCardSchema = z.object({
  component: z.literal('HomeCard'),
  props: z.object({
    category: z.string(),
    stage: z.string(),
    title: z.string(),
    subtitle: z.string(),
    readTime: z.string(),
    buttonLabel: z.string(),
    actionId: z.string().optional(),
  }).strict(),
});

const NextStepCardSchema = z.object({
  component: z.literal('NextStepCard'),
  props: z.object({
    title: z.string(),
    subtitle: z.string(),
    actionId: z.string().optional(),
  }).strict(),
});

const PracticeCardSchema = z.object({
  component: z.literal('PracticeCard'),
  props: z.object({
    eyebrow: z.string().optional(),
    title: z.string(),
    subtitle: z.string(),
    buttonLabel: z.string().optional(),
    buttonIconString: IconEnum.optional(),
  }).strict(),
});

const RevisitSectionSchema = z.object({
  component: z.literal('RevisitSection'),
  props: z.object({
    title: z.string().optional(),
    items: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        subtitle: z.string(),
        iconString: IconEnum,
      })
    ),
  }).strict(),
});

// 3. The Master Union
// Any new component you build gets added to this array.
const UIComponentSchema = z.discriminatedUnion('component', [
  HomeCardSchema,
  NextStepCardSchema,
  PracticeCardSchema,
  RevisitSectionSchema,
]);

// 4. The Layout Structure
export const HomeLayoutSchema = z.object({
  mainCard: UIComponentSchema.nullable(),
  nextStepSection: UIComponentSchema.nullable(),
});

export type ValidatedHomeLayout = z.infer<typeof HomeLayoutSchema>;

// 5. The Component Registry
export const TrustedCatalogue: Record<string, any> = {
  HomeCard: HomeCard,
  NextStepCard: NextStepCard,
  PracticeCard: PracticeCard,
  RevisitSection: RevisitSection,
};