// Local-date (not UTC) formatting — avoids the classic toISOString() bug
// where a date can shift a day depending on the browser's timezone offset.
export function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * The 7 days (Sun-Sat) of the week at `weekOffset` weeks from today's week
 * (0 = this week, 1 = next week, ...). Each entry carries the real
 * calendar date so day rows can show "Sunday, Oct 5" style labels.
 */
export function getWeekDays(weekOffset = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay() + weekOffset * 7);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    return {
      iso: toIsoDate(date),
      weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
      shortDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      isToday: toIsoDate(date) === toIsoDate(today),
    };
  });
}
