// The Practice tab and quick practice still run on sample content (MockPracticeRepository): they
// are not yet connected to the learner's LearnHouse course. Shown on screen so a demo never
// presents these items as the learner's real progress (W3 review: fixtures shown as real state).
// Remove the notice when practice items come from the learner's course.
export const PRACTICE_IS_SAMPLE = true;
export const PRACTICE_SAMPLE_NOTICE = "Sample content: Practice isn't connected to your course yet, so these items are examples.";
