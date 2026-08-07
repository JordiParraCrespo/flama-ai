/**
 * Normalizes unset AND blank (`FOO=`) env vars to `undefined`, so optional
 * schema keys (`z.string().optional()`, `.url().optional()`) treat both the
 * same and absence stays representable in the parsed config.
 */
export const orUndefined = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};
