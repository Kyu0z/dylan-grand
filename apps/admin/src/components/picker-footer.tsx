import type { ReactNode } from 'react';

type PickerFooterProps = {
  shortcuts: ReactNode;
  actions?: ReactNode;
};

/** Keep shortcut and confirmation actions in distinct, responsive groups. */
export function PickerFooter({ shortcuts, actions }: PickerFooterProps) {
  return (
    <div className="popover-footer picker-footer">
      <div className="picker-footer-shortcuts">{shortcuts}</div>
      {actions && <div className="picker-footer-actions">{actions}</div>}
    </div>
  );
}
