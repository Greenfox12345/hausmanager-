/**
 * Date utility functions for recurring tasks
 */

/**
 * Get the nth occurrence of a weekday in a month
 * @param year - The year
 * @param month - The month (0-11, JavaScript Date convention)
 * @param weekday - The day of the week (0=Sunday, 6=Saturday)
 * @param occurrence - Which occurrence (1=first, 2=second, etc.)
 * @returns Date object or null if the occurrence doesn't exist in that month
 */
export function getNthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  occurrence: number
): Date | null {
  // Start at the first day of the month
  const firstDay = new Date(year, month, 1);
  
  // Find the first occurrence of the target weekday
  let daysUntilWeekday = (weekday - firstDay.getDay() + 7) % 7;
  let targetDate = 1 + daysUntilWeekday;
  
  // Add weeks to get to the nth occurrence
  targetDate += (occurrence - 1) * 7;
  
  // Check if this date exists in the month
  const result = new Date(year, month, targetDate);
  if (result.getMonth() !== month) {
    // Date rolled over to next month (e.g., 5th Monday doesn't exist)
    return null;
  }
  
  return result;
}

/**
 * Get which occurrence of a weekday a date represents
 * @param date - The date to analyze
 * @returns Object with weekday (0-6) and occurrence (1-5)
 */
export function getWeekdayOccurrence(date: Date): { weekday: number; occurrence: number } {
  const weekday = date.getDay();
  const dayOfMonth = date.getDate();
  
  // Calculate which occurrence (1st, 2nd, 3rd, etc.)
  const occurrence = Math.ceil(dayOfMonth / 7);
  
  return { weekday, occurrence };
}

/**
 * Calculate the next occurrence of a recurring task based on monthly recurrence mode
 * @param currentDate - The current/last occurrence date
 * @param monthsToAdd - Number of months to add
 * @param mode - 'same_date' or 'same_weekday'
 * @returns Next occurrence date
 */
export function getNextMonthlyOccurrence(
  currentDate: Date,
  monthsToAdd: number,
  mode: 'same_date' | 'same_weekday'
): Date {
  if (mode === 'same_date') {
    // Simple: add months, keep same day of month
    const result = new Date(currentDate);
    result.setMonth(result.getMonth() + monthsToAdd);
    return result;
  } else {
    // Complex: find the same weekday occurrence in the target month
    const { weekday, occurrence } = getWeekdayOccurrence(currentDate);
    
    const targetMonth = new Date(currentDate);
    targetMonth.setMonth(targetMonth.getMonth() + monthsToAdd);
    
    const result = getNthWeekdayOfMonth(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      weekday,
      occurrence
    );
    
    // Fallback to last occurrence if nth doesn't exist (e.g., 5th Monday)
    if (!result) {
      // Try the previous occurrence
      const fallback = getNthWeekdayOfMonth(
        targetMonth.getFullYear(),
        targetMonth.getMonth(),
        weekday,
        occurrence - 1
      );
      return fallback || targetMonth; // Ultimate fallback to first of month
    }
    
    return result;
  }
}

/**
 * Format weekday occurrence for display (e.g., "3. Donnerstag")
 * @param date - The date to format
 * @param locale - Locale for day name (default: 'de')
 * @returns Formatted string like "3. Donnerstag"
 */
export function formatWeekdayOccurrence(date: Date, locale: string = 'de'): string {
  const { weekday, occurrence } = getWeekdayOccurrence(date);
  
  const dayNames: Record<string, string[]> = {
    de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  };
  
  const dayName = (dayNames[locale] || dayNames.de)[weekday];
  
  return `${occurrence}. ${dayName}`;
}

/**
 * Calculate the next occurrence of a recurring task with explicit weekday and occurrence
 * @param startDate - The starting date (used for year/month calculation)
 * @param monthsToAdd - Number of months to add
 * @param weekday - The day of the week (0=Sunday, 6=Saturday)
 * @param occurrence - Which occurrence (1=first, 2=second, 3=third, 4=fourth, 5=last)
 * @returns Next occurrence date
 */
export function getNextMonthlyOccurrenceExplicit(
  startDate: Date,
  monthsToAdd: number,
  weekday: number,
  occurrence: number
): Date {
  const targetMonth = new Date(startDate);
  targetMonth.setMonth(targetMonth.getMonth() + monthsToAdd);
  
  // Handle "last" occurrence (5)
  if (occurrence === 5) {
    // Find the last occurrence of the weekday in the month
    // Start from the last day of the month and work backwards
    const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
    const lastDayWeekday = lastDay.getDay();
    
    // Calculate days to subtract to get to the target weekday
    let daysToSubtract = (lastDayWeekday - weekday + 7) % 7;
    const result = new Date(lastDay);
    result.setDate(lastDay.getDate() - daysToSubtract);
    
    return result;
  }
  
  // For 1st-4th occurrence, use existing function
  const result = getNthWeekdayOfMonth(
    targetMonth.getFullYear(),
    targetMonth.getMonth(),
    weekday,
    occurrence
  );
  
  // Fallback to last occurrence if nth doesn't exist
  if (!result) {
    const fallback = getNthWeekdayOfMonth(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      weekday,
      occurrence - 1
    );
    return fallback || targetMonth;
  }
  
  return result;
}

/**
 * UTC-based version of getNextMonthlyOccurrence.
 * Uses UTC date components throughout to avoid server-timezone drift.
 * A date like 2025-01-13T00:00:00Z stays on the 13th regardless of server TZ.
 */
export function getNextMonthlyOccurrenceUTC(
  currentDate: Date,
  monthsToAdd: number,
  mode: 'same_date' | 'same_weekday'
): Date {
  const y = currentDate.getUTCFullYear();
  const mo = currentDate.getUTCMonth(); // 0-based
  const day = currentDate.getUTCDate();
  const h = currentDate.getUTCHours();
  const min = currentDate.getUTCMinutes();

  const targetMo = mo + monthsToAdd;

  if (mode === 'same_date') {
    // Clamp to last day of target month to avoid overflow (e.g. Jan 31 + 1 month)
    const targetYear = y + Math.floor(targetMo / 12);
    const normMo = ((targetMo % 12) + 12) % 12;
    const daysInMonth = new Date(Date.UTC(targetYear, normMo + 1, 0)).getUTCDate();
    const clampedDay = Math.min(day, daysInMonth);
    return new Date(Date.UTC(targetYear, normMo, clampedDay, h, min));
  } else {
    // same_weekday: find the same nth weekday in the target month
    const targetYear = y + Math.floor(targetMo / 12);
    const normMo = ((targetMo % 12) + 12) % 12;

    // Determine which nth weekday the current date is (UTC)
    const weekday = currentDate.getUTCDay(); // 0=Sun
    const occurrence = Math.ceil(day / 7);   // 1-5

    // Find the first day of target month
    const firstOfMonth = new Date(Date.UTC(targetYear, normMo, 1));
    const firstWeekday = firstOfMonth.getUTCDay();

    // Days until first occurrence of target weekday
    const daysUntil = (weekday - firstWeekday + 7) % 7;
    const targetDay = 1 + daysUntil + (occurrence - 1) * 7;

    // Check if this day exists in the month
    const daysInMonth = new Date(Date.UTC(targetYear, normMo + 1, 0)).getUTCDate();
    if (targetDay <= daysInMonth) {
      return new Date(Date.UTC(targetYear, normMo, targetDay, h, min));
    }
    // Fallback: use the previous (4th) occurrence
    const fallbackDay = targetDay - 7;
    return new Date(Date.UTC(targetYear, normMo, fallbackDay, h, min));
  }
}
