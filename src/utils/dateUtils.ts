/**
 * Returns the current date in YYYY-MM-DD format based on local timezone.
 * This avoids the common UTC offset bug where it's already 'tomorrow' in UTC.
 */
export const getLocalISOString = (date: Date = new Date()): string => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

/**
 * Formats a YYYY-MM-DD string into a readable date like "Monday, May 18"
 */
export const formatReadableDate = (dateStr: string): string => {
  const today = getLocalISOString();
  const yesterday = getLocalISOString(new Date(Date.now() - 86400000));
  const tomorrow = getLocalISOString(new Date(Date.now() + 86400000));

  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  if (dateStr === tomorrow) return 'Tomorrow';

  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};
