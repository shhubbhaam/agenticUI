// src/contracts/slides.ts
// What the BFF tells the app about a slide deck (a PDF activity, or a PDF inside an article).
// Platform-neutral: the BFF validates every response against this before sending, the app parses it
// again. The app never receives a LearnHouse or Google address: it downloads the PDF ONLY from the
// BFF's fixed file route (/me/courses/:c/activities/:a/slides/file).
import { z } from 'zod';

const Uuid = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);

export const SlideDeckSchema = z.discriminatedUnion('kind', [
  // `version` changes when the deck's file changes, so the app's cached copy is refetched.
  z.object({ kind: z.literal('pdf'), version: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/) }).strict(),
  z.object({ kind: z.literal('unavailable'), reason: z.enum(['not_slides', 'no_file', 'not_downloadable']) }).strict(),
]);
export type SlideDeckInfo = z.infer<typeof SlideDeckSchema>;

export const SlideDeckResponseSchema = z.object({
  activityUuid: Uuid,
  title: z.string().min(1).max(200),
  deck: SlideDeckSchema,
}).strict();
export type SlideDeckResponse = z.infer<typeof SlideDeckResponseSchema>;
