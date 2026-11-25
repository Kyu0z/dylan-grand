import { useId, useState, type FormEvent } from 'react';
import { Button, Modal } from './ui';
import { L } from '../lib/domain';
import { useLocale } from '../lib/locale';
import { roleNames, useAdminAuth } from '../lib/admin-auth';
import { PasswordField, PasswordStrength } from '../pages/auth';
export type AccountDialogKind = 'profile' | 'password';
type AccountDialogProps = {
  kind: AccountDialogKind;
  onClose: () => void;
  onChangePassword: () => void;
  onSignedOut: () => void;
};
export function AccountDialog({ kind, onClose, onChangePassword, onSignedOut }: AccountDialogProps) {
  const { t } = useLocale();
  const { user, api, clear, notify } = useAdminAuth();
  const formId = useId();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy)
      return;
    if (password !== confirmPassword) {
      notify('Passwords do not match.', true);
      return;
    }
    setBusy(true);
    try {
      await api('/auth/staff/change-password', { method: 'POST', body: { currentPassword, password } });
      clear();
      onSignedOut();
    }
    catch {
      // The shared API client displays translated error messages.
    }
    finally {
      setBusy(false);
    }
  };
  if (kind === 'profile') {
    return (<Modal
      title={t(L('My Profile', 'Hồ sơ cá nhân'))}
      onClose={onClose}
      footer={<>
        <Button type="button" variant="ghost" onClick={onClose}>
          {t(L('Close', 'Đóng'))}
        </Button>
        <Button type="button" icon="key" onClick={onChangePassword}>
          {t(L('Change password', 'Đổi mật khẩu'))}
        </Button>
      </>}
    >
      <div className="staff-profile-summary">
        <div>
          <small>
            {t(L('Full name', 'Họ tên'))}
          </small>
          <strong>
            {user?.fullName || '—'}
          </strong>
        </div>
        <div>
          <small>Email</small>
          <strong>
            {user?.email}
          </strong>
        </div>
        <div>
          <small>
            {t(L('Role', 'Vai trò'))}
          </small>
          <strong>
            {user && t(roleNames[user.role])}
          </strong>
        </div>
      </div>
    </Modal>);
  }
  return (<Modal
    title={t(L('Change password', 'Đổi mật khẩu'))}
    onClose={() => {
      if (!busy)
        onClose();
    }}
    footer={<>
      <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
        {t(L('Cancel', 'Hủy'))}
      </Button>
      <Button type="submit" form={formId} disabled={busy} icon="check">
        {t(busy ? L('Processing…', 'Đang xử lý…') : L('Save changes', 'Lưu thay đổi'))}
      </Button>
    </>}
  >
    <form id={formId} className="staff-auth-card staff-password-form" onSubmit={submit}>
      <p>
        {t(L('Update your password to keep your account secure.', 'Cập nhật mật khẩu để bảo vệ tài khoản của bạn.'))}
      </p>
      <PasswordField
        label={t(L('Current password', 'Mật khẩu hiện tại'))}
        value={currentPassword}
        onChange={setCurrentPassword}
        current
      />
      <PasswordField
        label={t(L('New password', 'Mật khẩu mới'))}
        value={password}
        onChange={setPassword}
      />
      <PasswordField
        label={t(L('Confirm password', 'Xác nhận mật khẩu'))}
        value={confirmPassword}
        onChange={setConfirmPassword}
      />
      <PasswordStrength password={password} />
      <small>
        {t(L('Use at least 12 characters. You will need to sign in again after changing your password.', 'Sử dụng ít nhất 12 ký tự. Bạn sẽ cần đăng nhập lại sau khi đổi mật khẩu.'))}
      </small>
    </form>
  </Modal>);
}
