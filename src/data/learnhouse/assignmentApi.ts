// Assignment quizzes, through the BFF. The BFF makes every LearnHouse call AS the learner (with their
// LearnHouse token, held server-side) and maps LearnHouse's shapes to src/contracts/assignment.ts;
// the app names only the course + activity and never sees LearnHouse ids or tokens.
// The quiz carries no correct answers: LearnHouse grades on hand-in.
export {
  getAssignmentQuiz, getSavedAnswers, submitAssignment, getAssignmentGrade, retryAssignment,
} from '../../core/api/learnhouse/client';
export type { AssignmentQuiz, AssignmentGrade, QuizAnswers, QuizTask, QuizQuestion } from '../../contracts/assignment';
