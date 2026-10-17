import { Button } from '@flama/design-system-web';
import { Check, Copy } from '@flama/design-system-web/icons';
import { useTranslation } from 'react-i18next';

/**
 * The single-use backup codes, shown once: the API keeps them encrypted and
 * never hands them back, so the reader copies them now or generates new ones.
 */
export function BackupCodes({
  codes,
  copied,
  onCopy,
}: {
  codes: string[];
  copied: boolean;
  onCopy: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      <ul
        aria-label={t('profile.twoFactor.backupCodesLabel')}
        className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-xl border border-border-subtle bg-surface-sunken px-5 py-4 font-mono text-sm text-ink-900"
      >
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={onCopy}>
        {copied ? <Check /> : <Copy />}
        {t('profile.twoFactor.copyCodes')}
      </Button>
    </div>
  );
}
