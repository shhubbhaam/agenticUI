// Pure derivation of the capability scores behind the Skills & evidence
// screens (radar chart, skill bars, evidence drill-down). Zero RN / network
// imports. Nothing here names a skill: every axis comes from the trail.
//
// AXES (in priority order)
//  1. TAGGED: chapters carry a skill tag in the LearnHouse chapter
//     `extra_metadata` under the key `skill` (read + trimmed in
//     data/learnhouse/progressApi.ts -> `Chapter.skill`). Distinct tags
//     (case-insensitive, label = first spelling seen) in first-appearance
//     order across all courses (courses in trail order, chapters by `order`).
//     score = completed activities / total activities across that skill's
//     chapters. Untagged chapters are ignored once any chapter is tagged.
//  2. FALLBACK (no chapter has a tag): one axis per course from the trail,
//     label = course_name, score = completion_percentage / 100.
//
// RADAR: needs 3..5 axes. `radarSkills` = the first 5 skills when there are at
// least 3, else empty (the screen then shows the readable list only - no fake
// axes). Skills beyond the 5th appear only in the readable list (`skills`).
//
// EVIDENCE DIMENSIONS (from the trail's real activity_type):
//   Exposure      = video + article activities
//   Understanding = document + other activities (reading/practice checkpoints)
//   Application   = assignment activities (applied tasks); when the trail also
//                   returns a numeric per-activity `grade` for assignments,
//                   the graded count and average feed the Application caption.
import type { Activity, ActivityType, CourseProgress } from '../learning/types';
import { crestDecor, type CrestIconKey, type CrestTone } from './crestDecor';

export type SkillId = string;
export type SkillIconKey = CrestIconKey;
export type SkillTone = CrestTone;

export const MAX_RADAR_AXES = 5;
export const MIN_RADAR_AXES = 3;

const EXPOSURE_TYPES: readonly ActivityType[] = ['video', 'article'];
const UNDERSTANDING_TYPES: readonly ActivityType[] = ['document', 'other'];
const APPLICATION_TYPES: readonly ActivityType[] = ['assignment'];

export interface DimensionCount {
  done: number;
  total: number;
}

export interface GradeSummary {
  // Assignment activities that carry a numeric grade.
  count: number;
  // Mean of those grades (scale as returned by the API), null when none.
  average: number | null;
}

export interface SkillEvidence {
  exposure: DimensionCount;
  understanding: DimensionCount;
  application: DimensionCount;
  grades: GradeSummary;
}

export type SkillActionKind = 'evidence' | 'explore';
export type SkillsSource = 'tagged' | 'course' | 'none';

export interface SkillProgress {
  id: SkillId;
  name: string;
  axisLabel: string;
  // Position among all skills; screens use it to pick a (decorative) colour.
  paletteIndex: number;
  crestIcon: SkillIconKey;
  crestTone: SkillTone;
  evidenceTitle: string;
  evidenceBody: string;
  score: number;
  evidence: SkillEvidence;
  actionKind: SkillActionKind;
  caption: string;
}

export interface SkillsDerivation {
  source: SkillsSource;
  skills: SkillProgress[];
  radarSkills: SkillProgress[];
}

function count(activities: Activity[], types: readonly ActivityType[]): DimensionCount {
  const matching = activities.filter((a) => types.includes(a.type));
  return { done: matching.filter((a) => a.completed).length, total: matching.length };
}

export function summarizeGrades(activities: Activity[]): GradeSummary {
  const grades = activities
    .filter((a) => a.type === 'assignment' && typeof a.grade === 'number' && Number.isFinite(a.grade))
    .map((a) => a.grade as number);
  if (grades.length === 0) return { count: 0, average: null };
  return { count: grades.length, average: grades.reduce((sum, g) => sum + g, 0) / grades.length };
}

export function deriveEvidence(activities: Activity[]): SkillEvidence {
  return {
    exposure: count(activities, EXPOSURE_TYPES),
    understanding: count(activities, UNDERSTANDING_TYPES),
    application: count(activities, APPLICATION_TYPES),
    grades: summarizeGrades(activities),
  };
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

function buildSkill(
  id: string,
  name: string,
  paletteIndex: number,
  activities: Activity[],
  score: number,
): SkillProgress {
  const evidence = deriveEvidence(activities);
  const done = activities.filter((a) => a.completed).length;
  const hasEvidence = evidence.exposure.done > 0 && (evidence.understanding.done > 0 || evidence.application.done > 0);
  const { icon, tone } = crestDecor(paletteIndex);
  return {
    id,
    name,
    axisLabel: name,
    paletteIndex,
    crestIcon: icon,
    crestTone: tone,
    evidenceTitle: 'Evidence so far.',
    evidenceBody:
      activities.length === 0
        ? `There are no activities recorded for ${name} yet.`
        : `You’ve completed ${done} of ${activities.length} ${plural(activities.length, 'activity', 'activities')} in ${name}.`,
    score,
    evidence,
    actionKind: hasEvidence ? 'evidence' : 'explore',
    caption: skillCaption(evidence, score),
  };
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

function deriveTaggedSkills(courses: CourseProgress[]): SkillProgress[] {
  const groups = new Map<string, { name: string; activities: Activity[] }>();
  for (const course of courses) {
    for (const chapter of [...course.chapters].sort((a, b) => a.order - b.order)) {
      const tag = chapter.skill?.trim();
      if (!tag) continue;
      const key = tag.toLowerCase();
      const group = groups.get(key) ?? { name: tag, activities: [] };
      group.activities.push(...chapter.activities);
      groups.set(key, group);
    }
  }
  return [...groups.entries()].map(([key, group], index) => {
    const done = group.activities.filter((a) => a.completed).length;
    const score = group.activities.length === 0 ? 0 : done / group.activities.length;
    return buildSkill(`skill:${key}`, group.name, index, group.activities, score);
  });
}

function deriveCourseSkills(courses: CourseProgress[]): SkillProgress[] {
  return courses.map((course, index) =>
    buildSkill(
      `course:${course.courseUuid}`,
      course.courseName,
      index,
      course.chapters.flatMap((c) => c.activities),
      clamp01(course.completionPercentage / 100),
    ),
  );
}

export function deriveSkills(courses: CourseProgress[]): SkillsDerivation {
  const anyTag = courses.some((c) => c.chapters.some((ch) => ch.skill?.trim()));
  const source: SkillsSource = courses.length === 0 ? 'none' : anyTag ? 'tagged' : 'course';
  const skills = source === 'tagged' ? deriveTaggedSkills(courses) : source === 'course' ? deriveCourseSkills(courses) : [];
  const radarSkills = skills.length >= MIN_RADAR_AXES ? skills.slice(0, MAX_RADAR_AXES) : [];
  return { source, skills, radarSkills };
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

function formatGrade(n: number): string {
  return String(Math.round(n * 10) / 10);
}

export function deriveEvidenceRows(evidence: SkillEvidence): EvidenceRow[] {
  const { exposure, understanding, application, grades } = evidence;
  const applicationBase =
    application.done > 0
      ? `${application.done} applied ${plural(application.done, 'task', 'tasks')} submitted`
      : 'Applied task still ahead';
  const applicationDetail =
    grades.count > 0 && grades.average !== null
      ? `${applicationBase} · ${grades.count} graded, average ${formatGrade(grades.average)}`
      : applicationBase;
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
      detail: applicationDetail,
    },
  ];
}
