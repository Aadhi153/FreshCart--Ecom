const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

function pluralize(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? '' : 's'} ago`;
}

export function timeAgo(dateString: string): string {
  const diffSeconds = Math.max(0, (Date.now() - new Date(dateString).getTime()) / 1000);
  if (diffSeconds < MINUTE) return 'just now';
  if (diffSeconds < HOUR) return pluralize(Math.floor(diffSeconds / MINUTE), 'minute');
  if (diffSeconds < DAY) return pluralize(Math.floor(diffSeconds / HOUR), 'hour');
  if (diffSeconds < WEEK) return pluralize(Math.floor(diffSeconds / DAY), 'day');
  if (diffSeconds < MONTH) return pluralize(Math.floor(diffSeconds / WEEK), 'week');
  if (diffSeconds < YEAR) return pluralize(Math.floor(diffSeconds / MONTH), 'month');
  return pluralize(Math.floor(diffSeconds / YEAR), 'year');
}
