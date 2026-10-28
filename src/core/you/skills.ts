// Pure derivation of the five capability scores behind the Skills & evidence
// screens (pentagon chart, skill bars, evidence drill-down). Zero RN / network
// imports.
//
// MAPPING (Figma defines the five axes but not which chapters feed them, so
// this is a deterministic choice). Chapters are taken in `order`; the index
// below is the position in the course's 8-chapter arc used by the chapter
// collection crests (Foundations, Prompting, Context, Workflows, Agents,
// Privacy, Value, Capstone):
//   Prompting  <- chapters 0,1  (Foundations, Prompting)
//   Context    <- chapter  2    (Context)
//   Workflows  <- chapters 3,7  (Workflows, Capstone)
//   AI agents  <- chapter  4    (Agents)
//   Judgement  <- chapters 5,6  (Privacy, Value)
// score = completed activities / total activities across the mapped chapters
// (0 when none of them exist or they have no activities).
//
// EVIDENCE DIMENSIONS (the API has no quiz-correctness data, so they are
// derived from the activity type):
//   Exposure      = video + article activities
//   Understanding = document + other activities (reading/practice checkpoints)
//   Application   = assignment activities (applied tasks)
import type { Activity, ActivityType, CourseProgress } from '../learning/types';

export type SkillId = 'prompting' | 'context' | 'workflows' | 'agents' | 'judgement';
export type SkillIconKey = 'brief' | 'layers' | 'workflow' | 'agents' | 'shield';
export type SkillTone = 'indigo' | 'teal' | 'plum';

export interface SkillDefinition {
  id: SkillId;
  name: string;
  axisLabel: string;
  crestIcon: SkillIconKey;
  crestTone: SkillTone;
  chapterIndexes: readonly number[];
  evidenceTitle: string;
  evidenceBody: string;
}

// Order = pentagon axis order, clockwise from the top.
export const SKILLS: readonly SkillDefinition[] = [
  {
    id: 'prompting',
    name: 'Prompting at Work',
    axisLabel: 'Prompting',
    crestIcon: 'brief',
    crestTone: 'indigo',
    chapterIndexes: [0, 1],
    evidenceTitle: 'A sharper ask.',
    evidenceBody: 'You’ve shaped prompts with a clear role, task and format to get a usable first draft.',
  },
  {
    id: 'context',
    name: 'Working with Context',
    axisLabel: 'Context',
    crestIcon: 'layers',
    crestTone: 'plum',
    chapterIndexes: [2],
    evidenceTitle: 'A clearer brief.',
    evidenceBody: 'You’ve used context to create a brief with a defined audience, sources and output.',
  },
  {
    id: 'workflows',
    name: 'Workflow Automation',
    axisLabel: 'Workflows',
    crestIcon: 'workflow',
    crestTone: 'indigo',
    chapterIndexes: [3, 7],
    evidenceTitle: 'A repeatable routine.',
    evidenceBody: 'You’ve turned a one-off task into steps you can run again and again.',
  },
  {
    id: 'agents',
    name: 'AI Agents',
    axisLabel: 'AI agents',
    crestIcon: 'agents',
    crestTone: 'teal',
    chapterIndexes: [4],
    evidenceTitle: 'A helper that acts.',
    evidenceBody: 'You’ve explored how an agent plans, uses tools and checks its own work.',
  },
  {
    id: 'judgement',
    name: 'AI Judgement',
    axisLabel: 'Judgement',
    crestIcon: 'shield',
    crestTone: 'teal',
    chapterIndexes: [5, 6],
    evidenceTitle: 'A steadier call.',
    evidenceBody: 'You’ve weighed privacy, risk and value before deciding how to use AI.',
  },
];

const EXPOSURE_TYPES: readonly ActivityType[] = ['video', 'article'];
const UNDERSTANDING_TYPES: readonly ActivityType[] = ['document', 'other'];
const APPLICATION_TYPES: readonly ActivityType[] = ['assignment'];

export interface DimensionCount {
  done: number;
  total: number;
}

export interface SkillEvidence {
  exposure: DimensionCount;
  understanding: DimensionCount;
  application: DimensionCount;
}

export type SkillActionKind = 'evidence' | 'explore';

export interface SkillProgress {
  id: SkillId;
  name: string;
  axisLabel: string;
  crestIcon: SkillIconKey;
  crestTone: SkillTone;
  evidenceTitle: string;
  evidenceBody: string;
  score: number;
  evidence: SkillEvidence;
  actionKind: SkillActionKind;
  caption: string;
}

function count(activities: Activity[], types: readonly ActivityType[]): DimensionCount {
  const matching = activities.filter((a) => types.includes(a.type));
  return { done: matching.filter((a) => a.completed).length, total: matching.length };
}

export function skillCaption(evidence: SkillEvidence, score: number): string {
  const { exposure, understanding, application } = evidence;
  if (score <= 0) return 'Not started yet';
  if (exposure.done > 0 && understanding.done > 0 && application.done > 0) {
    return 'Exposure · Understanding · Application';
  }
  if (exposure.done > 0 && understanding.done > 0) return 'Exposure · Understanding · Application ahead';
  if (exposure.done > 0 && application.done > 0) return 'Exposure · Application · Understanding ahead';
  if (exposure.done > 0) return 'Exposure recorded · Application ahead';
  return 'Learning in progress';
}

export function deriveSkills(course: CourseProgress | null): SkillProgress[] {
  const chapters = course ? [...course.chapters].sort((a, b) => a.order - b.order) : [];
  return SKILLS.map((skill) => {
    const activities = skill.chapterIndexes.flatMap((i) => chapters[i]?.activities ?? []);
    const done = activities.filter((a) => a.completed).length;
    const score = activities.length === 0 ? 0 : done / activities.length;
    const evidence: SkillEvidence = {
      exposure: count(activities, EXPOSURE_TYPES),
      understanding: count(activities, UNDERSTANDING_TYPES),
      application: count(activities, APPLICATION_TYPES),
    };
    const hasEvidence = evidence.exposure.done > 0 && (evidence.understanding.done > 0 || evidence.application.done > 0);
    return {
      id: skill.id,
      name: skill.name,
      axisLabel: skill.axisLabel,
      crestIcon: skill.crestIcon,
      crestTone: skill.crestTone,
      evidenceTitle: skill.evidenceTitle,
      evidenceBody: skill.evidenceBody,
      score,
      evidence,
      actionKind: hasEvidence ? 'evidence' : 'explore',
      caption: skillCaption(evidence, score),
    };
  });
}

export function hasSkillProgress(skills: SkillProgress[]): boolean {
  return skills.some((s) => s.score > 0);
}

export type EvidenceKind = 'exposure' | 'understanding' | 'application';

export interface EvidenceRow {
  kind: EvidenceKind;
  title: string;
  detail: string;
}

function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? singular : pluralForm;
}

export function deriveEvidenceRows(evidence: SkillEvidence): EvidenceRow[] {
  const { exposure, understanding, application } = evidence;
  return [
    {
      kind: 'exposure',
      title: 'Exposure',
      detail: `${exposure.done} ${plural(exposure.done, 'lesson', 'lessons')} completed`,
    },
    {
      kind: 'understanding',
      title: 'Understanding',
      detail: `${understanding.done} of ${understanding.total} ${plural(understanding.total, 'checkpoint', 'checkpoints')} completed`,
    },
    {
      kind: 'application',
      title: 'Application',
      detail:
        application.done > 0
          ? `${application.done} applied ${plural(application.done, 'task', 'tasks')} submitted`
          : 'Applied task still ahead',
    },
  ];
}
