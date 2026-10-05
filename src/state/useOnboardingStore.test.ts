import { useOnboardingStore, emptyAnswers } from './useOnboardingStore';

describe('useOnboardingStore', () => {
  beforeEach(() => {
    useOnboardingStore.setState({ answers: emptyAnswers(), completed: false });
  });

  it('starts empty', () => {
    const { answers, completed } = useOnboardingStore.getState();
    expect(answers).toEqual({
      role: null, experience: null, goal: null, budgetMinutes: null,
      formats: [], diagnostic: { 1: null, 2: null, 3: null },
    });
    expect(completed).toBe(false);
  });

  it('stores single-choice answers', () => {
    const s = useOnboardingStore.getState();
    s.setAnswer('role', 'marketing');
    s.setAnswer('budgetMinutes', 10);
    expect(useOnboardingStore.getState().answers.role).toBe('marketing');
    expect(useOnboardingStore.getState().answers.budgetMinutes).toBe(10);
  });

  it('toggles formats on and off, keeping others', () => {
    const s = useOnboardingStore.getState();
    s.toggleFormat('reading');
    s.toggleFormat('listening');
    expect(useOnboardingStore.getState().answers.formats).toEqual(['reading', 'listening']);
    useOnboardingStore.getState().toggleFormat('reading');
    expect(useOnboardingStore.getState().answers.formats).toEqual(['listening']);
    useOnboardingStore.getState().clearFormats();
    expect(useOnboardingStore.getState().answers.formats).toEqual([]);
  });

  it('stores diagnostic answers per question', () => {
    useOnboardingStore.getState().setDiagnosticAnswer(2, 'check-source');
    expect(useOnboardingStore.getState().answers.diagnostic).toEqual({ 1: null, 2: 'check-source', 3: null });
  });

  it('marks completed and resets answers without touching completed', () => {
    const s = useOnboardingStore.getState();
    s.setAnswer('goal', 'save-time');
    s.markCompleted();
    useOnboardingStore.getState().resetAnswers();
    expect(useOnboardingStore.getState().answers).toEqual(emptyAnswers());
    expect(useOnboardingStore.getState().completed).toBe(true);
  });
});
