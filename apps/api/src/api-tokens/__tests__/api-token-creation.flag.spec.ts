import { FEATURE_FLAGS } from '@flama/shared';
import { describe, expect, it } from 'vitest';

describe('api_token_creation', () => {
  // A kill switch: an outage of the flag service must not stop token creation.
  it('is live by default', () => {
    expect(FEATURE_FLAGS.api_token_creation.defaultValue).toBe(true);
  });
});
