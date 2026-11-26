import { L, type Localized } from '../lib/domain';
import { useLocale } from '../lib/locale';
import './delete-confirmation.css';

export function DeleteConfirmation({ target }: { target: Localized | string; }) {
  const { t } = useLocale();

  return (
    <p className="delete-confirmation-message">
      {t(L('Are you sure you want to delete', 'Bạn có chắc chắn muốn xóa'))}{' '}
      <strong>“{t(target)}”</strong>?
    </p>
  );
}
