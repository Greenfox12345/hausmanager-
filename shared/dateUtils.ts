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
