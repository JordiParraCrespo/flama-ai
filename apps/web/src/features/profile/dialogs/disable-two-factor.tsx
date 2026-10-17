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
  toast,
} from '@flama/design-system-web';
import { ShieldOff } from '@flama/design-system-web/icons';
import { useDisableTwoFactor } from '@flama/frontend-consumer/react';
import { useErrorMessage } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';
import { TwoFactorPasswordForm } from '@/features/profile/forms/two-factor-password-form';

const FORM = 'disable-two-factor';

/** Turns two-factor off behind the password, and owns that mutation. */
export function DisableTwoFactorDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const disable = useDisableTwoFactor({
    onSuccess: () => {
      toast.success(t('toasts.twoFactorDisabled'));
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHero gradient="pinkCoral">
          <DialogHeroPlate>
            <ShieldOff className="text-destructive" />
          </DialogHeroPlate>
        </DialogHero>
        <DialogHeader>
          <DialogTitle>{t('profile.twoFactor.disableTitle')}</DialogTitle>
          <DialogDescription>{t('profile.twoFactor.disableDescription')}</DialogDescription>
        </DialogHeader>
        {disable.error && (
          <Alert variant="destructive">
            <AlertDescription>
              {resolveError(disable.error, t('common.error')).message}
            </AlertDescription>
          </Alert>
        )}
        <TwoFactorPasswordForm
          id={FORM}
          isPending={disable.isPending}
          onSubmit={({ password }) => disable.mutate(password)}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form={FORM} variant="destructive" disabled={disable.isPending}>
            {t('profile.twoFactor.disable')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
