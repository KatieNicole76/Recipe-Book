// Keyed by the 2-decimal-place rounding of each fraction, since the
// backend's amount field only stores 2 decimal places (e.g. 1/3 -> 0.33,
// 1/8 -> 0.13) — matching precision here is what lets a saved/extracted
// amount round-trip back to its fraction glyph instead of a raw decimal.
const FRACTION_MAP = {
  0.13: '⅛',
  0.25: '¼',
  0.33: '⅓',
  0.38: '⅜',
  0.5: '½',
  0.63: '⅝',
  0.67: '⅔',
  0.75: '¾',
  0.88: '⅞',
};

// The backend's amount field only allows 2 decimal places — rounding here
// (rather than only at save time) means a value is always already valid
// and already matches its displayed fraction, with no manual fix-up needed.
export function roundAmount(amount) {
  if (amount === null || amount === undefined) return null;
  return Math.round(parseFloat(amount) * 100) / 100;
}

export function unitConversion(amount) {
  if (amount === null || amount === undefined) return '';

  const num = parseFloat(amount);
  const whole = Math.floor(num);
  const decimalPart = Math.round((num - whole) * 100) / 100;

  if (decimalPart === 0) {
    return whole === 0 ? '' : String(whole);
  }

  const fraction = FRACTION_MAP[decimalPart];

  if (!fraction) {
    return String(num);
  }

  return whole > 0 ? `${whole}${fraction}` : fraction;
}

// Reverse of FRACTION_MAP, so a value displayed as a fraction glyph (by
// unitConversion) parses back to the same number if the field is never
// touched — otherwise blurring an untouched field would wipe it to null.
const GLYPH_TO_DECIMAL = Object.fromEntries(
  Object.entries(FRACTION_MAP).map(([decimal, glyph]) => [glyph, parseFloat(decimal)])
);

export function parseAmountInput(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // e.g. "⅓" or "2½" — exactly what unitConversion() produces
  const glyphMatch = trimmed.match(/^(\d+)?\s*([⅛¼⅓⅜½⅝⅔¾⅞])$/);
  if (glyphMatch) {
    const [, whole, glyph] = glyphMatch;
    return roundAmount((whole ? parseInt(whole) : 0) + GLYPH_TO_DECIMAL[glyph]);
  }

  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const [, whole, num, denom] = mixedMatch;
    return roundAmount(parseInt(whole) + parseInt(num) / parseInt(denom));
  }

  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const [, num, denom] = fractionMatch;
    return roundAmount(parseInt(num) / parseInt(denom));
  }

  const decimal = parseFloat(trimmed);
  return isNaN(decimal) ? null : roundAmount(decimal);
}