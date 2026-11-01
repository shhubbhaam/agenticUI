import { deriveEvidence, deriveEvidenceRows, deriveSkills, hasSkillProgress, skillCaption, summarizeGrades } from './skills';
import { makeActivity, makeChapter, makeCourse, makeUniformCourse } from './fixtures';

const tagged = (order: number, skill: string | null, done: number, total: number) =>
  makeChapter(
    order,
    Array.from({ length: total }, (_, i) => makeActivity(`${order}${i}`.padStart(2, '0') + `x${order}${i}`, 'video', i < done)),
    { skill, name: `Chapter ${order}` },
  );

describe('deriveSkills - tagged chapters', () => {
  it('builds distinct axes in first-appearance order with completed/total scores', () => {
    const course = makeCourse([
      tagged(0, 'Writing', 2, 2),
      tagged(1, 'Analysis', 0, 2),
      tagged(2, ' writing ', 0, 2),
      tagged(3, 'Delivery', 1, 4),
    ]);
    const { source, skills, radarSkills } = deriveSkills([course]);
    expect(source).toBe('tagged');
    expect(skills.map((s) => [s.name, s.score])).toEqual([['Writing', 0.5], ['Analysis', 0], ['Delivery', 0.25]]);
    expect(radarSkills).toHaveLength(3);
    expect(skills.map((s) => s.paletteIndex)).toEqual([0, 1, 2]);
    expect(new Set(skills.map((s) => s.id)).size).toBe(3);
  });

  it('ignores untagged chapters once any chapter is tagged, and sorts by chapter order', () => {
    const course = makeCourse([tagged(3, 'B', 1, 1), tagged(0, 'A', 1, 2), tagged(1, null, 1, 1), tagged(2, '', 1, 1)]);
    expect(deriveSkills([course]).skills.map((s) => s.name)).toEqual(['A', 'B']);
  });

  it('aggregates a tag across courses', () => {
    const c1 = makeCourse([tagged(0, 'Shared', 1, 2)], { courseUuid: 'c1' });
    const c2 = makeCourse([tagged(0, 'Shared', 2, 2)], { courseUuid: 'c2' });
    const [only] = deriveSkills([c1, c2]).skills;
    expect(only.score).toBe(0.75);
  });

  it('caps the radar at five axes but lists every skill', () => {
    const course = makeCourse(Array.from({ length: 7 }, (_, i) => tagged(i, `Skill ${i}`, 1, 1)));
    const { skills, radarSkills } = deriveSkills([course]);
    expect(skills).toHaveLength(7);
    expect(radarSkills.map((s) => s.name)).toEqual(['Skill 0', 'Skill 1', 'Skill 2', 'Skill 3', 'Skill 4']);
  });

  it('hides the radar with fewer than three axes', () => {
    const { skills, radarSkills } = deriveSkills([makeCourse([tagged(0, 'A', 1, 1), tagged(1, 'B', 0, 1)])]);
    expect(skills).toHaveLength(2);
    expect(radarSkills).toEqual([]);
  });

  it('reports progress only when some skill has a score', () => {
    expect(hasSkillProgress(deriveSkills([makeCourse([tagged(0, 'A', 0, 2)])]).skills)).toBe(false);
    expect(hasSkillProgress(deriveSkills([makeCourse([tagged(0, 'A', 1, 2)])]).skills)).toBe(true);
  });

  it('scores 0 for a tagged chapter with no activities', () => {
    expect(deriveSkills([makeCourse([tagged(0, 'Empty', 0, 0)])]).skills[0].score).toBe(0);
  });
});

describe('deriveSkills - per-course fallback', () => {
  it('uses one axis per course with completion_percentage as the score', () => {
    const courses = [
      makeCourse([tagged(0, null, 1, 2)], { courseUuid: 'a', courseName: 'Course A', completionPercentage: 50 }),
      makeCourse([tagged(0, null, 0, 1)], { courseUuid: 'b', courseName: 'Course B', completionPercentage: 0 }),
      makeCourse([tagged(0, null, 1, 1)], { courseUuid: 'c', courseName: 'Course C', completionPercentage: 100 }),
    ];
    const { source, skills, radarSkills } = deriveSkills(courses);
    expect(source).toBe('course');
    expect(skills.map((s) => [s.name, s.score])).toEqual([['Course A', 0.5], ['Course B', 0], ['Course C', 1]]);
    expect(radarSkills).toHaveLength(3);
  });

  it('clamps a nonsensical percentage', () => {
    const c = makeCourse([], { courseUuid: 'x', completionPercentage: 140 });
    expect(deriveSkills([c]).skills[0].score).toBe(1);
  });

  it('shows a single course in the list but not on the radar', () => {
    const { skills, radarSkills } = deriveSkills([makeUniformCourse(4, 2, 1)]);
    expect(skills).toHaveLength(1);
    expect(radarSkills).toEqual([]);
  });

  it('returns nothing for no courses', () => {
    expect(deriveSkills([])).toEqual({ source: 'none', skills: [], radarSkills: [] });
  });
});

describe('evidence', () => {
  it('splits evidence by activity type and picks the action', () => {
    const course = makeCourse([
      makeChapter(0, [
        makeActivity('1', 'video', true),
        makeActivity('2', 'article', true),
        makeActivity('3', 'document', true),
        makeActivity('4', 'document', false),
        makeActivity('5', 'assignment', true),
      ], { skill: 'S' }),
    ]);
    const [s] = deriveSkills([course]).skills;
    expect(s.evidence).toEqual({
      exposure: { done: 2, total: 2 },
      understanding: { done: 1, total: 2 },
      application: { done: 1, total: 1 },
      grades: { count: 0, average: null },
    });
    expect(s.actionKind).toBe('evidence');
    expect(s.caption).toBe('Exposure · Understanding · Application');
    expect(s.evidenceBody).toContain('4 of 5 activities');
  });

  it('offers Explore when only exposure is recorded', () => {
    const course = makeCourse([makeChapter(0, [makeActivity('1', 'video', true), makeActivity('2', 'assignment', false)], { skill: 'S' })]);
    const [s] = deriveSkills([course]).skills;
    expect(s.actionKind).toBe('explore');
    expect(s.caption).toBe('Exposure recorded · Application ahead');
  });

  it('summarises numeric grades on assignments only', () => {
    const acts = [
      makeActivity('1', 'assignment', true, null, 80),
      makeActivity('2', 'assignment', true, null, 91),
      makeActivity('3', 'assignment', false, null, null),
      makeActivity('4', 'video', true, null, 100),
    ];
    expect(summarizeGrades(acts)).toEqual({ count: 2, average: 85.5 });
    expect(deriveEvidence(acts).grades.count).toBe(2);
    expect(summarizeGrades([makeActivity('1', 'assignment', true)])).toEqual({ count: 0, average: null });
  });
});

describe('skillCaption', () => {
  const zero = { done: 0, total: 1 };
  const g = { count: 0, average: null };
  it('covers each combination', () => {
    expect(skillCaption({ exposure: zero, understanding: zero, application: zero, grades: g }, 0)).toBe('Not started yet');
    expect(skillCaption({ exposure: zero, understanding: zero, application: { done: 1, total: 1 }, grades: g }, 0.2)).toBe('Learning in progress');
    expect(skillCaption({ exposure: { done: 1, total: 1 }, understanding: { done: 1, total: 1 }, application: zero, grades: g }, 0.5)).toBe('Exposure · Understanding · Application ahead');
    expect(skillCaption({ exposure: { done: 1, total: 1 }, understanding: zero, application: { done: 1, total: 1 }, grades: g }, 0.5)).toBe('Exposure · Application · Understanding ahead');
  });
});

describe('deriveEvidenceRows', () => {
  const noGrades = { count: 0, average: null };
  it('words the three dimensions', () => {
    const rows = deriveEvidenceRows({
      exposure: { done: 4, total: 4 },
      understanding: { done: 4, total: 5 },
      application: { done: 1, total: 1 },
      grades: noGrades,
    });
    expect(rows.map((r) => r.title)).toEqual(['Exposure', 'Understanding', 'Application']);
    expect(rows[0].detail).toBe('4 lessons completed');
    expect(rows[1].detail).toBe('4 of 5 checkpoints completed');
    expect(rows[2].detail).toBe('1 applied task submitted');
  });

  it('handles singular and empty counts', () => {
    const rows = deriveEvidenceRows({
      exposure: { done: 1, total: 1 },
      understanding: { done: 0, total: 1 },
      application: { done: 0, total: 0 },
      grades: noGrades,
    });
    expect(rows[0].detail).toBe('1 lesson completed');
    expect(rows[1].detail).toBe('0 of 1 checkpoint completed');
    expect(rows[2].detail).toBe('Applied task still ahead');
  });

  it('adds real grade info to the Application caption when graded assignments exist', () => {
    const rows = deriveEvidenceRows({
      exposure: { done: 1, total: 1 },
      understanding: { done: 0, total: 0 },
      application: { done: 2, total: 3 },
      grades: { count: 2, average: 86.25 },
    });
    expect(rows[2].detail).toBe('2 applied tasks submitted · 2 graded, average 86.3');
  });
});
