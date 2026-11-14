jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
import { decisionErrorMessage } from './useCoachStream';
import { connectionText } from './CoachScreen';

describe('coach screen text (M6)', () => {
  it('explains a refused approval in plain words (S10)', () => {
    expect(decisionErrorMessage('proposal_changed')).toMatch(/changed/);
    expect(decisionErrorMessage('expired')).toMatch(/expired/);
    expect(decisionErrorMessage('session_changed')).toMatch(/signed in again/);
    expect(decisionErrorMessage('already_decided')).toMatch(/already answered/);
    expect(decisionErrorMessage(undefined)).toMatch(/connection/);
  });

  it('says when it is reconnecting, and nothing once the run is over', () => {
    expect(connectionText('reconnecting', false)).toMatch(/Reconnecting/);
    expect(connectionText('live', false)).toBeNull();
    expect(connectionText('reconnecting', true)).toBeNull();
  });
});
