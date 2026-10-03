import { z } from 'zod';

// 1. Define exact props allowed for each component (excluding functions)
const HomeCardSchema = z.object({
  component: z.literal('HomeCard'),
  props: z.object({
    category: z.string(),
    stage: z.string(),
    title: z.string(),
    subtitle: z.string(),
    readTime: z.string(),
    buttonLabel: z.string(),
    actionId: z.string().optional(), // Used by client to know what function to run
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

// 2. Define the overall layout structure expected by your template slots
export const HomeLayoutSchema = z.object({
  mainCard: z.discriminatedUnion('component', [HomeCardSchema, NextStepCardSchema]).nullable(),
  nextStepSection: z.discriminatedUnion('component', [HomeCardSchema, NextStepCardSchema]).nullable(),
});

export type ValidatedHomeLayout = z.infer<typeof HomeLayoutSchema>;


import { HomeCard } from '../ui/organisms/home/HomeCard';
import { NextStepCard } from '../ui/molecules/home/NextStepCard';

export const TrustedCatalogue: Record<string, any> = {
  HomeCard: HomeCard,
  NextStepCard: NextStepCard,
};