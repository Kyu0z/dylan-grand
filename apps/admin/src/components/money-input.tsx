import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { formatMoneyDraft, moneyCaret, normalizeMoneyDraft, validMoneyPaste, numericDraftValid } from '../lib/money-input';

type MoneyInputProps = {
  label?: ReactNode;
  value: string | number;
  onValueChange: (raw: string) => void;
  required?: boolean;
  signed?: boolean;
  disabled?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
};

/** Shared, controlled VND input. Its callback always receives an unformatted draft. */
export function MoneyInput({ label, value, onValueChange, required, signed = false, disabled, placeholder, min, max }: MoneyInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  const display = formatMoneyDraft(value);
  useLayoutEffect(() => {
    if (caret.current !== null && ref.current === document.activeElement) {
      ref.current?.setSelectionRange(caret.current, caret.current);
    }
    caret.current = null;
    if (ref.current) {
      const invalid = (min !== undefined || max !== undefined) && String(value) !== '' && !numericDraftValid(value, min ?? -Number.MAX_SAFE_INTEGER, max ?? Number.MAX_SAFE_INTEGER);
      // Legacy form constraints retain native validity; live forms use localized ActionDialog validation.
      ref.current.setCustomValidity(invalid ? 'Invalid amount / Số tiền không hợp lệ.' : '');
    }
  });
  const update = (input: HTMLInputElement, candidate: string, offset: number) => {
    const raw = normalizeMoneyDraft(candidate, signed);
    if (raw === null) return;
    const formatted = formatMoneyDraft(raw);
    const prefix = candidate.slice(0, offset).replace(/\./g, '');
    const logical = Math.max(0, prefix.length - Math.max(0, candidate.replace(/\./g, '').length - raw.length));
    caret.current = moneyCaret(formatted, logical);
    // Keep caret stable even when the raw value does not change (e.g. deleting a separator).
    input.value = formatted;
    input.setSelectionRange(caret.current, caret.current);
    onValueChange(raw);
  };
  return <label className="form-field">
    {label && <span className="form-label">{label}</span>}
    <input
      ref={ref}
      className="field-control money-input"
      type="text"
      inputMode={signed ? 'text' : 'numeric'}
      autoComplete="off"
      spellCheck={false}
      value={display}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      onChange={event => update(event.currentTarget, event.currentTarget.value, event.currentTarget.selectionStart ?? event.currentTarget.value.length)}
      onPaste={event => {
        event.preventDefault();
        const pasted = event.clipboardData.getData('text').trim();
        if (!validMoneyPaste(pasted, signed)) return;
        const input = event.currentTarget;
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? start;
        const raw = pasted.replace(/\./g, '');
        update(input, input.value.slice(0, start) + raw + input.value.slice(end), start + raw.length);
      }}
      onKeyDown={event => {
        const input = event.currentTarget;
        if (event.key === '.' || event.key === ',' || (!signed && event.key === '-')) {
          event.preventDefault();
          return;
        }
        const start = input.selectionStart;
        if (start === null || start !== input.selectionEnd) return;
        // Delete the adjacent digit instead of repeatedly deleting a separator that is restored.
        if (event.key === 'Backspace' && start >= 2 && input.value[start - 1] === '.') {
          event.preventDefault();
          update(input, input.value.slice(0, start - 2) + input.value.slice(start), start - 2);
        } else if (event.key === 'Delete' && input.value[start] === '.' && start + 1 < input.value.length) {
          event.preventDefault();
          update(input, input.value.slice(0, start) + input.value.slice(start + 2), start);
        }
      }}
    />
  </label>;
}
