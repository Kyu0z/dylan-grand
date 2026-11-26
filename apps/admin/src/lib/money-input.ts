/** A VND draft is an integer string; never send its display separators to an API. */
export function normalizeMoneyDraft(value: string, signed = false): string | null {
  const raw = value.replace(/\./g, '');
  if (!(signed ? /^-?\d*$/ : /^\d*$/).test(raw)) return null;
  return raw.replace(/^(-?)0+(?=\d)/, '$1');
}

export function formatMoneyDraft(raw: string | number): string {
  return String(raw).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function validMoneyPaste(value: string, signed = false): boolean {
  return (signed ? /^-?(?:\d+|\d{1,3}(?:\.\d{3})+)$/ : /^(?:\d+|\d{1,3}(?:\.\d{3})+)$/).test(value);
}

/** Restore the logical digit position after thousands separators change. */
export function moneyCaret(formatted: string, logicalOffset: number): number {
  if (logicalOffset <= 0) return 0;
  let count = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (formatted[i] !== '.' && ++count === logicalOffset) return i + 1;
  }
  return formatted.length;
}

export function numericDraftValid(raw: string | number, min: number, max: number): boolean {
  const value = String(raw);
  return /^-?\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) >= min && Number(value) <= max;
}
