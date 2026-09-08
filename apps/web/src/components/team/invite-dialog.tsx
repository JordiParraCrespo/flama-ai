import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogHero,
  DialogHeroPlate,
  DialogTitle,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from '@flama/design-system-web';
import { MailPlus } from '@flama/design-system-web/icons';
import { useInviteMembers } from '@flama/frontend/react';
import {
  type InviteMembersFormDto,
  type InviteMembersFormInput,
  inviteMembersFormSchema,
} from '@flama/shared/schemas/organization';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '@/lib/use-error-message';
import { useZodResolver } from '@/lib/use-zod-resolver';

export function InviteDialog({
  open,
  onOpenChange,
  organizationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}) {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const invite = useInviteMembers();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteMembersFormInput, unknown, InviteMembersFormDto>({
    resolver: useZodResolver(inviteMembersFormSchema),
    defaultValues: { emails: '', role: 'member' },
  });
  const emails = useWatch({ control, name: 'emails' });
  const count = emails?.split(/[\n,]+/).filter((email) => email.trim()).length ?? 0;
  const roleOptions = [
    { label: t('pages.team.invite.roles.member'), value: 'member' },
    { label: t('pages.team.invite.roles.admin'), value: 'admin' },
    { label: t('pages.team.invite.roles.owner'), value: 'owner' },
  ];

  const submit = handleSubmit((values) => {
    invite.mutate(
      { organizationId, emails: values.emails, role: values.role },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
          toast.success(t('toasts.membersInvited'));
        },
      },
    );
  });

  /**
   * One field, but the error can land one level down.
   *
   * `emails` is typed as a string and transformed into an array before the
   * `z.string().email()` check runs, so Zod reports a bad address at
   * `emails.0` rather than `emails`. React Hook Form mirrors that shape: the
   * root becomes an array with no `message` of its own, `FieldError` finds
   * nothing to print, and the reader gets silence instead of a reason.
   */
  const emailsError = Array.isArray(errors.emails) ? errors.emails.find(Boolean) : errors.emails;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHero gradient="tealGreen">
          <DialogHeroPlate>
            <MailPlus />
          </DialogHeroPlate>
        </DialogHero>
        <DialogHeader>
          <DialogTitle>{t('pages.team.invite.title')}</DialogTitle>
          <DialogDescription>{t('pages.team.invite.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            {invite.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {resolveError(invite.error, t('pages.team.common.error')).message}
                </AlertDescription>
              </Alert>
            )}
            <Field data-invalid={Boolean(emailsError)}>
              <FieldLabel htmlFor="invite-emails">{t('pages.team.invite.emails')}</FieldLabel>
              <Textarea
                {...register('emails')}
                id="invite-emails"
                rows={4}
                placeholder={t('pages.team.invite.emailsPlaceholder')}
                aria-invalid={Boolean(emailsError)}
                disabled={invite.isPending}
              />
              <FieldDescription>{t('pages.team.invite.emailsHint')}</FieldDescription>
              <FieldError errors={[emailsError]} />
            </Field>
            <Controller
              control={control}
              name="role"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t('pages.team.invite.role')}</FieldLabel>
                  <Select
                    items={roleOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={invite.isPending}
                  >
                    <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('pages.team.common.cancel')}
              </Button>
              <Button type="submit" disabled={invite.isPending || !organizationId}>
                {invite.isPending
                  ? t('pages.team.invite.sending')
                  : count > 1
                    ? t('pages.team.invite.sendMany', { count })
                    : t('pages.team.invite.send')}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
