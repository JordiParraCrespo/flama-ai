import { createZodErrorMap } from '@flama/frontend-core/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import type { FieldValues, Resolver } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { input, output, ZodType } from 'zod';

/**
 * `zodResolver` wired to the active locale. The schemas in `@flama/shared` state
 * no messages of their own, so every failure is resolved from its issue code
 * into the user's language.
 */
export function useZodResolver<TSchema extends ZodType<unknown, FieldValues>>(
  schema: TSchema,
): Resolver<input<TSchema>, unknown, output<TSchema>> {
  const { t } = useTranslation();

  return useMemo(() => {
    return zodResolver(schema, { error: createZodErrorMap(t) }) as Resolver<
      input<TSchema>,
      unknown,
      output<TSchema>
    >;
  }, [schema, t]);
}
