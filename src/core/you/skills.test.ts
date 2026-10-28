import { deriveEvidenceRows, deriveSkills, hasSkillProgress, skillCaption, SKILLS } from './skills';
import { makeActivity, makeChapter, makeCourse, makeUniformCourse } from './fixtures';

describe('deriveSkills', () => {
  it('returns five zero-score skills for a null course', () => {
    const skills = deriveSkills(null);
    expect(skills.map((s) => s.id)).toEqual(['prompting', 'context', 'workflows', 'agents', 'judgement']);
    expect(skills.every((s) => s.score === 0 && s.actionKind === 'explore')).toBe(true);
    expect(hasSkillProgress(skills)).toBe(false);
  });

  it('maps chapters to skills: prompting<-0,1 context<-2 workflows<-3,7 agents<-4 judgement<-5,6', () => {
    const course = makeUniformCourse(8, 2, 0);
    course.chapters[2].activities.forEach((a) => { a.completed = true; });
    course.chapters[7].activities[0].completed = true;
    const byId = Object.fromEntries(deriveSkills(course).map((s) => [s.id, s.score]));
    expect(byId).toEqual({ prompting: 0, context: 1, workflows: 0.25, agents: 0, judgement: 0 });
  });

  it('scores 1 for every skill when everything is complete', () => {
    expect(deriveSkills(makeUniformCourse(8, 3, 8)).every((s) => s.score === 1)).toBe(true);
  });

  it('scores 0 when mapped chapters do not exist', () => {
    const skills = deriveSkills(makeUniformCourse(2, 2, 2));
    expect(skills.find((s) => s.id === 'agents')!.score).toBe(0);
    expect(skills.find((s) => s.id === 'prompting')!.score).toBe(1);
  });

  it('splits evidence by activity type and picks the action', () => {
    const course = makeCourse([
      makeChapter(0, [
        makeActivity('1', 'video', true),
        makeActivity('2', 'article', true),
        makeActivity('3', 'document', true),
        makeActivity('4', 'document', false),
        makeActivity('5', 'assignment', true),
      ]),
    ]);
    const prompting = deriveSkills(course)[0];
    expect(prompting.evidence).toEqual({
      exposure: { done: 2, total: 2 },
      understanding: { done: 1, total: 2 },
      application: { done: 1, total: 1 },
    });
    expect(prompting.actionKind).toBe('evidence');
    expect(prompting.caption).toBe('Exposure · Understanding · Application');
  });

  it('offers Explore when only exposure is recorded', () => {
    const course = makeCourse([makeChapter(0, [makeActivity('1', 'video', true), makeActivity('2', 'assignment', false)])]);
    const prompting = deriveSkills(course)[0];
    expect(prompting.actionKind).toBe('explore');
    expect(prompting.caption).toBe('Exposure recorded · Application ahead');
  });

  it('has a definition per axis with a unique id', () => {
    expect(new Set(SKILLS.map((s) => s.id)).size).toBe(5);
  });
});

describe('skillCaption', () => {
  const zero = { done: 0, total: 1 };
  it('covers each combination', () => {
    expect(skillCaption({ exposure: zero, understanding: zero, application: zero }, 0)).toBe('Not started yet');
    expect(skillCaption({ exposure: zero, understanding: zero, application: { done: 1, total: 1 } }, 0.2)).toBe('Learning in progress');
    expect(skillCaption({ exposure: { done: 1, total: 1 }, understanding: { done: 1, total: 1 }, application: zero }, 0.5)).toBe('Exposure · Understanding · Application ahead');
    expect(skillCaption({ exposure: { done: 1, total: 1 }, understanding: zero, application: { done: 1, total: 1 } }, 0.5)).toBe('Exposure · Application · Understanding ahead');
  });
});

describe('deriveEvidenceRows', () => {
  it('words the three dimensions', () => {
    const rows = deriveEvidenceRows({
      exposure: { done: 4, total: 4 },
      understanding: { done: 4, total: 5 },
      application: { done: 1, total: 1 },
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
    });
    expect(rows[0].detail).toBe('1 lesson completed');
    expect(rows[1].detail).toBe('0 of 1 checkpoint completed');
    expect(rows[2].detail).toBe('Applied task still ahead');
  });
});
