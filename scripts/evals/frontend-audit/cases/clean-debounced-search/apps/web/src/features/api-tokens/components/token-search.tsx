import { DataTableSearch } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';

/**
 * The search over the token list. The kit's field keeps what is being typed
 * and reports it once typing settles, so a keystroke never reaches the rows.
 */
export function TokenSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (query: string) => void;
}) {
  const { t } = useTranslation();

  return <DataTableSearch value={value} onChange={onChange} placeholder={t('common.search')} />;
}
