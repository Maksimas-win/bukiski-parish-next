// Integer-cent arithmetic for the 1,2 % calculator. Ported from the parish's
// standalone guide (bukiskis-parama/src/math.js) so both sites agree. Nothing
// here touches the network, storage or the DOM.

export const RATE_PER_MILLE = 12; // 1,2 % = 12 ‰
export const MAX_CENTS = 10000000000; // 100 000 000,00 €

/** "1 850,50" → 185050; null when the text is not a plain amount with ≤ 2 decimals. */
export function parseAmountToCents(value) {
  const raw = String(value).trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(raw)) return null;
  const [whole, fraction = ''] = raw.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents >= 0 && cents <= MAX_CENTS ? cents : null;
}

/** 1,2 % of an amount in cents, rounded half up to the cent. */
export function supportCents(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > MAX_CENTS) throw new RangeError('Invalid amount');
  return Math.floor((cents * RATE_PER_MILLE + 500) / 1000);
}

/**
 * What VMI would actually transfer for one person to one recipient for one tax
 * year: the minimum applies to each person's allocation separately, so small
 * allocations cannot be pooled across people to reach it.
 */
export function transferableSupportCents(cents, minimumCents = 300) {
  const result = supportCents(cents);
  return result >= minimumCents ? result : 0;
}

/** 'before' | 'during' | 'after' for an ISO calendar date against the filing window. */
export function campaignPhase(dateISO, { filingStart, filingDeadline }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) throw new TypeError('Expected an ISO date');
  if (dateISO < filingStart) return 'before';
  if (dateISO > filingDeadline) return 'after';
  return 'during';
}

/** Cents → "12,34" / "12.34" with thousands grouping in the given locale. */
export function formatCents(cents, locale) {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}
