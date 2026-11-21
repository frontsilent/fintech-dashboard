import { getErrorMessage } from './get-error-message';

describe('getErrorMessage', () => {
  it('returns the message of an Error', () => {
    expect(getErrorMessage(new Error('Boom'), 'Fallback')).toBe('Boom');
  });

  it('falls back for non-Error values and empty messages', () => {
    expect(getErrorMessage('Boom', 'Fallback')).toBe('Fallback');
    expect(getErrorMessage(new Error(''), 'Fallback')).toBe('Fallback');
  });
});
