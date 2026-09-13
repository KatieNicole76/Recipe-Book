const FRACTION_MAP = {
  0.125: '⅛',
  0.25: '¼',
  0.333: '⅓',
  0.375: '⅜',
  0.5: '½',
  0.625: '⅝',
  0.667: '⅔',
  0.75: '¾',
  0.875: '⅞',
};

export function unitConversion(amount) {
  if (amount === null || amount === undefined) return '';

  const num = parseFloat(amount);
  const whole = Math.floor(num);
  const decimalPart = Math.round((num - whole) * 1000) / 1000;

  if (decimalPart === 0) {
    return whole === 0 ? '' : String(whole);
  }

  const fraction = FRACTION_MAP[decimalPart];

  if (!fraction) {
    return String(num);
  }

  return whole > 0 ? `${whole}${fraction}` : fraction;
}

export function parseAmountInput(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const [, whole, num, denom] = mixedMatch;
    return parseInt(whole) + parseInt(num) / parseInt(denom);
  }

  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const [, num, denom] = fractionMatch;
    return parseInt(num) / parseInt(denom);
  }

  const decimal = parseFloat(trimmed);
  return isNaN(decimal) ? null : decimal;
}