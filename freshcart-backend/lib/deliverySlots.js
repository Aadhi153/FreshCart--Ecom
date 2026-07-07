const {
  DELIVERY_SLOT_WINDOWS,
  DELIVERY_SLOT_DAYS_AHEAD,
  DELIVERY_SLOT_BOOKING_BUFFER_MINUTES,
} = require('@freshcart/types');

// NOTE: all date/time arithmetic below uses the server process's local time zone,
// with no explicit TZ conversion — consistent with the rest of this codebase.
// Revisit if the backend and its customers ever span different time zones.

const WINDOWS_BY_ID = new Map(DELIVERY_SLOT_WINDOWS.map((w) => [w.id, w]));

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Today through today + (DELIVERY_SLOT_DAYS_AHEAD - 1), as 'YYYY-MM-DD' strings.
function getUpcomingDates() {
  const dates = [];
  const now = new Date();
  for (let i = 0; i < DELIVERY_SLOT_DAYS_AHEAD; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    dates.push(toDateKey(d));
  }
  return dates;
}

// The Date instant a given window starts on a given calendar date.
function slotStart(dateStr, windowId) {
  const window = WINDOWS_BY_ID.get(windowId);
  if (!window) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, window.startHour, 0, 0);
}

// True if the date is within the bookable horizon and the window hasn't started
// (plus a buffer) yet.
function isSlotBookable(dateStr, windowId) {
  const start = slotStart(dateStr, windowId);
  if (!start) return false;
  if (!getUpcomingDates().includes(dateStr)) return false;
  return start.getTime() - Date.now() > DELIVERY_SLOT_BOOKING_BUFFER_MINUTES * 60 * 1000;
}

// Human-readable label used everywhere orders are displayed, e.g. "Today, 4:00 PM – 6:00 PM".
function buildSlotLabel(dateStr, windowId) {
  const window = WINDOWS_BY_ID.get(windowId);
  if (!window) return null;

  const today = toDateKey(new Date());
  const tomorrow = toDateKey(new Date(new Date().setDate(new Date().getDate() + 1)));

  let dayLabel;
  if (dateStr === today) dayLabel = 'Today';
  else if (dateStr === tomorrow) dayLabel = 'Tomorrow';
  else {
    const [year, month, day] = dateStr.split('-').map(Number);
    dayLabel = new Date(year, month - 1, day).toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  return `${dayLabel}, ${window.label}`;
}

module.exports = { getUpcomingDates, isSlotBookable, buildSlotLabel, WINDOWS_BY_ID };
