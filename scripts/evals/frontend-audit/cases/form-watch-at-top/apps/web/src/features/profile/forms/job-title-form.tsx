import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
} from '@flama/design-system-web';
import { useZodResolver } from '@flama/frontend-web';
import { updateProfileSchema } from '@flama/shared/schemas/profile';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';

const jobTitleSchema = updateProfileSchema.pick({ jobTitle: true }).required();

export type JobTitleFormValues = z.infer<typeof jobTitleSchema>;

/**
 * Change the job title. The suggestions under the field are titles other
 * people in the workspace use, so a reader can pick one instead of typing.
 */
export function JobTitleForm({
  current,
  suggestions,
  isPending,
  onSubmit,
}: {
  current: string;
  suggestions: string[];
  isPending: boolean;
  onSubmit: (values: JobTitleFormValues) => void;
}) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<JobTitleFormValues>({
    resolver: useZodResolver(jobTitleSchema),
    defaultValues: { jobTitle: current },
  });
  const jobTitle = watch('jobTitle') ?? '';

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.jobTitle) || undefined}>
          <FieldLabel htmlFor="jobTitle">{t('profile.details.jobTitle')}</FieldLabel>
          <Input
            {...register('jobTitle')}
            id="jobTitle"
            aria-invalid={Boolean(errors.jobTitle)}
            disabled={isPending}
          />
          <FieldDescription>{jobTitle.length}/120</FieldDescription>
          <FieldError errors={[errors.jobTitle]} />
        </Field>
        <div className="flex flex-wrap gap-1">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setValue('jobTitle', suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>
        <Button type="submit" disabled={isPending || jobTitle === current}>
          {t('common.save')}
        </Button>
      </FieldGroup>
    </form>
  );
}
