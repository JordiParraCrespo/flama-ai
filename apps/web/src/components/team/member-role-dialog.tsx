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
  FieldError,
  FieldGroup,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@flama/design-system-web';
import { UserCog } from '@flama/design-system-web/icons';
import type { OrganizationMemberEntity, RoleEntity } from '@flama/frontend';
import { useAssignUserRoles } from '@flama/frontend/react';
import { type MemberRoleFormDto, memberRoleFormSchema } from '@flama/shared/schemas/role';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '@/lib/use-error-message';
import { useZodResolver } from '@/lib/use-zod-resolver';

export function MemberRoleDialog({
  member,
  roles,
  assignedRoles,
  onClose,
}: {
  member: OrganizationMemberEntity;
  roles: RoleEntity[];
  assignedRoles: RoleEntity[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const assign = useAssignUserRoles();
  const roleOptions = [
    { label: t('pages.team.memberRole.noRole'), value: 'none' },
    ...roles.map((role) => ({ label: role.name, value: role.id })),
  ];
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<MemberRoleFormDto>({
    resolver: useZodResolver(memberRoleFormSchema),
    defaultValues: { roleId: assignedRoles[0]?.id ?? null },
  });

  const submit = handleSubmit(({ roleId }) => {
    assign.mutate(
      { userId: member.userId, roleIds: roleId ? [roleId] : [] },
      { onSuccess: onClose },
    );
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHero gradient="tealGreen">
          <DialogHeroPlate>
            <UserCog />
          </DialogHeroPlate>
        </DialogHero>
        <DialogHeader>
          <DialogTitle>{t('pages.team.memberRole.title')}</DialogTitle>
          <DialogDescription>
            {t('pages.team.memberRole.description', { name: member.name })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            {assign.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {resolveError(assign.error, t('pages.team.common.error')).message}
                </AlertDescription>
              </Alert>
            )}
            <Controller
              control={control}
              name="roleId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t('pages.team.memberRole.role')}</FieldLabel>
                  <Select
                    items={roleOptions}
                    value={field.value ?? 'none'}
                    onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                    disabled={assign.isPending}
                  >
                    <SelectTrigger className="w-full">
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
                  <FieldError errors={[errors.roleId]} />
                </Field>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t('pages.team.common.cancel')}
              </Button>
              <Button type="submit" disabled={assign.isPending}>
                {t('pages.team.memberRole.save')}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
