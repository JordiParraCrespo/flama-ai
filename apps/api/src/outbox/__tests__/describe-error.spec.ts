import { describeError } from '@flama/backend-ddd';
import { describe, expect, it } from 'vitest';

describe('describeError', () => {
  it('answers an Error by its message', () => {
    expect(describeError(new TypeError('boom'))).toBe('boom');
  });

  it('answers anything else as a string', () => {
    expect(describeError('plain')).toBe('plain');
    expect(describeError(undefined)).toBe('undefined');
    expect(describeError(42)).toBe('42');
  });
});
